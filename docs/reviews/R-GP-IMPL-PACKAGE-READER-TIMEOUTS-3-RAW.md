# R-GP-IMPL-PACKAGE-READER-TIMEOUTS-3 — CC-REV-1 implementation review of syzygy-bpyt.4.13, round 3
Verdict: REVISE
Reviewed commit: e7f3c71e
Subject: r3-review.diff sha256 c4dae8b0d56e1bcb851304b4c44f06a1c0f2f562bef442eb468708869f75a4c0

Reviewer: fresh-context CC-REV-1 reviewer (rev-520c), 2026-10-25. I did not write this change or rounds 1 and 2, and I changed
nothing in it. I fetched no target repository content and opened no credential file. I worked in two scratch clones under
`rev-520c/` (`clone` for the probes, `clone2` for the gates), with every suite and every probe attempt under its own
`/tmp/r520c-*` TMPDIR. Both clones and all the TMPDIRs are deleted.

Why REVISE:
- Round 2's F2, F3 (a), F3 (b) and N7 are repaired, and steps 5 and 6 were carried out. Over 196 attempts against the head's
  script, no stop signal, however timed, however many and in whatever mix, left the tree dirty or a vitest descendant running.
  The one exception is a documented limit: a process that leaves vitest's process group.
- **F4 (blocking).** The restore still depends on `git checkout` succeeding. When it fails, both instrumented files stay
  written. I reproduced this on the stop path (exit 1) and on the normal path, where a completed run's record is also lost. A
  concurrent `git status` in the same worktree takes the very lock that makes it fail. The docstring and the PR body both say
  the restore happens "however it ends short of a SIGKILL". The brief's rule ("A script that can still leave the tree dirty … is
  blocking") makes F4 blocking.
- F4 lies in the restore, which is stop handling of `--profile` under the brief's definition. So the stopping rule applies:
  `--profile` comes out of this PR. The PR without it still meets its acceptance criteria (§5, F4).
- Notes: N8 (the exit status is not always 128 + the first signal), N9 (the reader thread swallows its own exception) and N10 (a
  PR-body wording).

## 1. Subject identity checks

Tool: `tools/check_identity.py`. Output: `check-identity.txt`.

**Frozen files.** [Observed] `sha256sum` gives:
- `lead/b413/r3-review.diff`: `c4dae8b0d56e1bcb851304b4c44f06a1c0f2f562bef442eb468708869f75a4c0`;
- `lead/b413/r3-delta.diff`: `3fe93550e7b673eaf154af2730cf922b011000553080769ac985cb9b7240477d`;
- the round-1 raw: `13044ae25a8dc51bab23ba976eba436098c1df64b8dd507a48c963f3ff7d23d7`;
- the round-2 raw: `e4e9238f5207cb2fb10b8822b9771ed2072fe630938900858ee92b2a46bd92aa`.

Each is the digest the brief names.

**Re-derived diffs.** [Observed] In my clone:
- `git diff df6046a1 e7f3c71e` hashes to `c4dae8b0…` and is byte-equal to the frozen file: "review diff byte-equal: True". It
  covers 15 paths.
- `git diff dc60c5bc e7f3c71e --` over those 15 paths hashes to `3fe93550…`: "delta diff byte-equal: True".
- The delta's numstat is +2,615/−178 over 3 files:
  - `measure-restore-probes.json` +2398/−74;
  - `tools/probe_measure_restore.py` +175/−82;
  - `scripts/measure_vitest_test_durations.py` +42/−22.
- `dc60c5bc..e7f3c71e` changes no other path in the whole tree.

**Branch and main.**
- [Observed] `git ls-remote origin` gives `e7f3c71e…` for `agent/syzygy-bpyt.4.13`. `gh pr view 520` gives the same head,
  OPEN.
- [Observed] `git merge-base e7f3c71e 3ec69299` is `df6046a1`. Main has moved on since the brief was written: `ls-remote` gives
  `71334012548cccd46a5a95e313a6014da87c8e3c`.
- [Observed] `git diff --name-only df6046a1 71334012` lists 116 paths. Their intersection with the 15 subject paths is empty,
  checked two ways (`sort | uniq -d` and a Python set). None of the 116 is under `packages/polaris-generation-consent/` or is a
  `vitest.config.ts`. So the base diff is still what would merge.

**Script digests.** [Observed] `scripts/measure_vitest_test_durations.py` is:
- `920c5f120209904b37cfe14320ea00edfa18eafbda12fd7dcb02ec8fcf4f1e97` at `dc60c5bc`;
- `72a0fabdd0dd12f85ad35fde4b3ee032125757d5276b85802d76fdf5288f0195` at `82565b2f` and at `e7f3c71e`.

Both match the brief. Two more checks:
- "fix 82565b2f script == head script: True";
- `82565b2f..e7f3c71e` changes only `measure-restore-probes.json`.

**Test file and timeouts.** [Observed]
- `package-reader.test.ts` is `bee795806a6d…` at both `dc60c5bc` and the head: "test file byte-equal dc60c5bc vs head: True".
- The 16 `}, N_000);` closers are equal in opener, test title, value and order: "timeouts equal dc60c5bc vs head: True". The
  values are 10000, 15000 ×5, 20000 ×2, 25000, 40000 ×3, 45000 ×3 and 50000.
- Second method: `, N_000)` occurs 17 times at the head. The 17th is `beforeAll(() => { full({}); }, 60_000);` (line 947),
  which is already at `df6046a1` (line 939).
- The PR's line-5 identity holds at the head (`tools/check_test_file.py`, `check-test-file.txt`): "reversed head == ce322e1a
  bytes: True". The testkit is byte-identical to `ce322e1a`'s (`3576a99d…`).
- All six duration records still name `0ef82cd0…`, the `3e563ec4` script.

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:18-51`, at `e7f3c71e`):
- "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent performing the
  change never finally decides which classes it touches."
- Class 4: "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- "**The change record states** which classes the change touches, or "none," so a misclassification is a findable violation after
  the fact."
- "**A reviewer or the owner** may reclassify at any time."

**GP-Q0, Part 1** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:52-55`): ""Behavior-
preserving" means none of the following changes: a rendered byte, a wire format, a refusal string or an exit code; a signed or
digest-bound artifact; a consent, security or retention decision."

**AGENTS.md at `e7f3c71e`:**
- Rule 2: "No "zero / all / 100%" claim without running that exact sweep this session, confirmed by a second method. Enumerate
  remainders."
- Rule 6: "Mutate the input and confirm the check fails, per predicate, before trusting it".
- Rule 9: "A claim of absence needs a sweep with a denominator."
- Rule 11: "An evidence record names its subject and the subject's digest; a record that names neither cannot be re-checked
  against the bytes it describes."
- Guardrail: "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it ran at; ids and outcomes
  alone are not re-runnable, and a rebase-merge leaves the recorded commit reachable from no ref."

**Test-rigor bar** (`th-engineering/subskills/test-rigor/SKILL.md`):
- 2: "**Every bugfix ships a regression test** — Written to fail on pre-fix code. A fix without a failing-then-passing test is
  unverified."
- 3: "**Edge and failure paths are first-class** — Empty inputs, boundaries, invalid states, error branches, and
  concurrency-sensitive paths get tests proportional to blast radius."

**Class ruling: none, confirming rounds 1 and 2.**
- [Observed] The delta since round 2 changes one evidence script, one evidence tool and one evidence record (§1). It touches no
  file under `apps/**` or `packages/**`, and no `vitest.config.ts`, CI workflow, battery step, `.syzygy/**` or `openspec/**`
  file.
- [Observed] `git grep -l -F` for `measure_vitest_test_durations` or `probe_measure_restore`, over the head's 3,701 tracked
  files, returns 10 files:
  - the eight records and tools under `docs/evidence/syzygy-bpyt-4-13/`;
  - the measurement script itself;
  - `scripts/size_vitest_test_timeouts.py`, whose docstring names it.

  None is a workflow, a manifest or a battery line.
- Class 4 stays adjacent and untouched. The test file that tests the egress consent reader is byte-identical to round 2's.
- GP-Q0: §6.

## 3. What I ran, and the results

Load1 ranged from 15.16 to 53.06 on 12 cores during the probes (56 readings, logged at each batch boundary in the four wave logs). The host ran other reviewers and
lanes beside me.

**Gates at `e7f3c71e`, in `clone2`** (after `npm ci`, exit 0):

| Gate | Result |
|---|---|
| `package-reader.test.ts` alone, default config | Exit 0. "Tests  299 passed (299)", load1 31.42→48.71 (`file-run-head.log`, `file-run-head.report.json`). The agreement test took 7,003 ms against its 50 s timeout. Every sized test used at most 14% of its timeout. The slowest unsized test took 436 ms. |
| `size_vitest_test_timeouts.py --check`, with the six inputs `timeout-sizing.json` names | Exit 0, "299 collected, 16 sized (10 from a lower bound), 0 problems" (`sizing-check-head.log`). Every top-level key of my output except `subject` equals the committed record. `subject` differs only in `commit` (e7f3c71e against 48ee832a); `fileSha256` is equal. |
| `npm run typecheck` | Exit 0 (`typecheck.log`) |
| `python3 scripts/check_governance.py` | Exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted" (`check-governance.log`) |
| `python3 scripts/check_quotations.py` | Exit 0, "36 quotations examined in 17 of 939 .md files scanned (loc-paren-quote 2, loc-colon-quote 24, quote-paren-loc 10), 0 findings" (`check-quotations.log`) |
| PROJECT-STATUS battery (`tools/battery.py`: the first `sh` block under "## How to verify this page", one line per command, rev-520b's method) | "commit=e7f3c71ef84f93cbdeef26db54fbdc63e05bc164 commands=110 nonzero=0". The block has 114 lines: 110 commands, 2 skipped and 2 assignments. The tree was clean afterwards (`battery.log`, `battery.json`). This reproduces the lane's line. Only one last line contains "FAIL" other than as "0 FAIL": "7 of 7 predicates without FAIL; PASS". |

I did not run the consent project as a whole, so PR body line 147 ("503 passed (503), 7 files") is the lane's.

**The lane's rule-6 record, by script** (`tools/check_probe_record.py`, `check-probe-record.txt`). [Observed]
- `schema` is `measure-restore-probes/2` and `commit` is `82565b2fb56f…`.
- `tool.sha256` equals `git show` of the tool at `82565b2f` and at the head.
- Each `scripts[]` digest equals `git show <commit>:scripts/measure_vitest_test_durations.py`: `round0` `3e563ec4`/`0ef82cd0`,
  `round1` `dc60c5bc`/`920c5f12`, `fix` `82565b2f`/`72a0fabd`. "fix script == HEAD script: True".
- The summary recomputed from the 122 results matches the stored one.
- Each of E, G, K and H fails at least once against `round1` and passes every attempt against `fix`, every `fix` attempt
  exercised: "(True, True, True)" ×4.

  | Probe | `round1` | `fix` |
  |---|---|---|
  | E | 14 of 18 | 18 of 18, all exit 143 |
  | G | 32 of 36 | 36 of 36, all exit 143 |
  | K | 0 of 1 (exit 1, both files written) | 1 of 1 (exit 0, 299/299) |
  | H | 0 of 1 (exit 129) | 1 of 1 (exit 0, 299/299) |

- The record stores the parameters (E: delays 800…2200 µs × 3; G: gaps 0…1000 µs × 4), attempts, passed, failed and the
  predicate.
- The `round1` failure details the PR body gives (line 45) match the records:
  - E's four left 11, 10, 10 and 10 processes, each including esbuild, and one including a `python3` recorder render;
  - G's four each left both files written and one `node (vitest 1)` running.

**My probes** (`tools/probe.py` with `inject.py`, `fake_npx.py` and `fake_git.py`; runner `tools/run_probes.sh`; one JSON
record per attempt under `probes/<batch>/`; table `probes-summary.txt` from `tools/summarize_probes.py`).

How the probes work:
- Each attempt starts the script in a session of its own, with SIGINT and SIGHUP reset to the default (SIGHUP ignored for H),
  and a private `/tmp/r520c-*` TMPDIR.
- Descendants are found every 50 ms in two ways: a `/proc` parent walk from the script's PID, and any process whose cwd is
  inside the clone and which started after the attempt began.
- 3 s after the script exits, a process survives if:
  - its PID keeps its recorded start time; or
  - it started after the attempt began and sits in a seen process group or session; or
  - its cwd is in the clone.
- An attempt passes only if `git status --porcelain --untracked-files=no` is then empty and nothing survives. K, H and P0 also
  need exit 0 and 299 tests (and 299 profile rows when profiled).
- Each record also stores `exitAsClaimed`: is the exit 128 + the first signal sent?
- Survivors were sent SIGKILL by PID. A dirty tree was restored after it was recorded.

Script versions:
- `head`: the clone's own script, `72a0fabd…`.
- `r1`: `dc60c5bc`'s script, copied to `tools/r1_measure_vitest_test_durations.py` (`920c5f12…`).
- `m1`: a one-line mutant of the head (`tools/m1_measure_vitest_test_durations.py`, `e8b6c205…`). It drops
  `start_new_session=True` from the restore's `git checkout` at line 123.

Where a batch runs two versions, their attempts alternate.

| Batch | Case | `head` pass | `r1` pass (or `m1`) |
|---|---|---|---|
| E | SIGTERM 800–2200 µs after the instrumented test-file write, 6 delays × 4 | 24/24, exit 143 ×24 | 11/24; 13 left vitest's tree (10–11 processes) running |
| ET | E traced (`inject.py trace` logs `Popen` entry and return with `stopped_by`), × 3 | 18/18. In 9 the signal landed inside `Popen` (`stopped_by` already set at its return), in 6 after it, in 3 before it | 5/18; all 13 failures raised `SystemExit` inside `Popen` |
| EARLYW | SIGTERM 0–400 µs after the write (before `Popen`), traced, 5 × 2 | 10/10 (5 inside `Popen`, 4 after, 1 before) | 3/10; 7 left vitest running |
| EARLYS | SIGTERM 0–400 ms after spawn (start-up, `git status`, instrument), traced, 8 × 2 | 16/16 clean, 0 survivors. Exit −15 ×11 (0–150 ms: before line 35 installs the handlers, no trace line, nothing written), 143 ×5 | 16/16 |
| G | two SIGTERMs 0–1000 µs apart, 0.5 s into vitest, 9 gaps × 7 (wave 1 ×3, wave 2 ×4) | 63/63 (27 + 36), exit 143 ×63 | 59/63 (27/27 then 32/36); 4 left both files written and one worker running |
| K | `os.killpg` race injected (first ESRCH probe answered "alive") | 2/2: exit 0, 299/299, `KILLPG … 0 -> ESRCH, answered alive (injected)` then `KILLPG … 15 -> ESRCH` | 0/2: exit 1, both files written |
| H | SIGHUP 3 s into vitest, SIGHUP inherited ignored | 2/2: exit 0, 299/299 | 0/2: exit 129, no record |
| MIX | SIGINT/SIGTERM/SIGHUP interleaved: a burst right after the write; a burst 0.5 s into vitest; SIGINT then a mixed signal (or SIGINT to the script's group) every 20 ms for 2 s through end_group and the restore; × 3 | 9/9 clean, 0 survivors. Exits −15, −2, 129 ×3, 130 ×3, 143 (N8) | 3/9; 6 dirty, 4 with survivors |
| RSTOP | fake `git` delays `checkout` 1.5 s; SIGTERM, then SIGINT to the script's group and SIGTERM/SIGHUP/SIGINT to its PID every 100 ms while `checkout` runs | 4/4 (2 + 2), exit 143 | `r1` 2/2 (its `git` inherits the stop signals ignored); `m1` 0/2: exit 1, both files written. The mutant shows the probe fails when the restore shares the script's group. |
| LOCK | `.git/index.lock` held 0.5 s into vitest, then SIGTERM | **0/1: exit 1, both files written** (F4) | 0/1, the same |
| LOCKN | the lock held 3 s into vitest, no signal; the run completes and restores | **0/1: exit 1, both files written, no OUT.json** (F4) | — |
| PIPE | fake `npx` writes 64 KiB blocks flat out; SIGTERM once ≥4 MiB was written (1.25 and 1.54 s in) | 2/2, exit 143 at 2.7 and 3.1 s | — |
| PIPEX | fake `npx` writes 32 MiB and exits 0 | 1/1, exit 0 in 0.6 s, run recorded | — |
| LINGER | fake `npx` exits at once; a child in its group holds stdout for 6 s; SIGTERM 0.5 s after the parent exits | 2/2, exit 143 in 1.3–1.4 s, the child ended by the group stop | — |
| LINGERN | the same, no signal | 2/2 (one a tool smoke run), exit 0 after 6.3 and 6.5 s: the loop waits for stdout's EOF | — |
| NOTERM | fake `npx` ignores SIGTERM; SIGTERM 1 s in | 1/1, exit 143 at 11.2 s: SIGKILL after GRACE_SECONDS | — |
| DETACH | fake `npx`'s child calls `setsid()` and holds stdout; SIGTERM | 0/1: exit 143, tree clean, 1 survivor, the `setsid` child. This is the documented limit ("A process that has left vitest's process group is out of the cleanup's reach"). No shutdown crash with the reader thread still blocked. | — |
| DETACHX | the same child, the parent exits at once, no signal | 1/1, exit 0 after 20.8 s, when the out-of-group child closed stdout | — |
| PTY | the script's terminal is a pty; its master is closed 3 s into vitest (a real hangup) | 2/2 clean, 0 survivors, **exit 120** (N8) | 2/2, exit 129 |
| BADUTF8 | fake `npx` writes one `PROF` line and a 0xff byte, exits 0 | exit 0, run recorded with **0 profile rows** (N9) | exit 1, `UnicodeDecodeError` from `communicate()` |
| P0 | profiled run to the end under `strace` without `-f` (the script's main thread only) | 2/2 (waves 2 and 3), exit 0, 299/299; write set below | — |
| G-np, EARLYS-np, MIX-np, H-np, P0-np | the same cases with `--profile` left off (the PR as it would be after the stopping rule) | G 18/18, EARLYS 8/8 (exit −15 ×3, 143 ×5), MIX 2/2 exercised (`write` has no trigger without `--profile`, so its third attempt sent nothing), H 1/1 (exit 0, 299), P0 1/1 (exit 0, 299 tests, 0 profile rows) | — |

**Totals.**
- [Observed] 196 attempts ran the head's script: 195 records under `probes/*/`, plus the wave-2 P0 record kept as
  `probes/P0-wave2-head-None-1.json`. Two methods, the records and a `grep` of the four wave logs, agree:
  - **dirty: LOCK and LOCKN only** (2);
  - **with a survivor: DETACH only** (1).
- [Observed] The other non-passes are not defects:
  - MIX-np `write` was not exercised;
  - the wave-2 P0 failed my first write predicate, which was too narrow. It passes the corrected one, which also allows
    `/dev/null` and tempfile's writability probe. The re-check is in `probes-summary.txt`.
- [Observed] In 0 of the head's stop attempts was a stopped run recorded.
- [Observed] `r1` ran 150 attempts: 13 dirty, 41 with survivors. `m1` ran 2: both dirty.

**What the script writes** (P0 under `strace -e trace=open,openat,creat,rename*,unlink*,mkdir*,rmdir,truncate,…`). [Observed]
The main thread's writes, in both P0 runs, were:
- tempfile's writability probe in TMPDIR (`openat(… O_CREAT|O_EXCL …)` then `unlink`);
- `mkdir` of its TemporaryDirectory;
- the testkit and the test file, `O_WRONLY|O_CREAT|O_TRUNC`, under `--profile` only;
- `/dev/null` (vitest's stderr);
- `unlinkat(4, "report.json")` and `rmdir` of the TemporaryDirectory;
- `measure-out.json`.

Nothing else. The TMPDIR afterwards held only my files and Node's `node-compile-cache`. [Inferred] The reader and sampler
threads, which strace without `-f` does not follow, only read a pipe and `/proc/loadavg`. So the script still writes only
OUT.json, the two instrumented files, and transients it removes.

**The poll loop.**
- **Recorded durations.** [Observed] Per-test durations come from vitest's JSON report. `size_vitest_test_timeouts.py` reads only
  `durationMs`, `status` and `load1` from a record (`grep -F` for `wallSeconds`/`exitCode` in it returns no line). [Inferred]
  So the 0.05 s poll can move only `wallSeconds`, by at most one poll interval before its 0.1 s rounding, and no input to the
  rule. No duration record was re-run, so no committed value moved.
- **Exit code of a normal run.** [Observed] Unchanged: exit 0 and `exitCode` 0 in P0 ×2, P0-np, PIPEX, LINGERN ×2, DETACHX, K
  ×2 and H ×3.
- **Is the reader thread joined?** [Observed] No: `reader.join()` appears nowhere; `sampler.join()` is the only `join`.
  - On the normal path the loop waits until `reader.is_alive()` is false, so `output` is complete. LINGERN waited 6 s for an
    in-group child's EOF. DETACHX waited 20.8 s for an out-of-group one, as `communicate()` did.
  - On the stop path the daemon reader is abandoned. It ends once the group's pipe ends close (LINGER, PIPE). With an
    out-of-group holder, the script still exited 143 (DETACH).
- **Can a full pipe stall vitest?**
  - [Observed] Not while the reader runs. PIPE and PIPEX pushed ≥4 MiB and 32 MiB through without a stall, and stderr is
    `/dev/null`.
  - [Inferred] Not even when the reader fails. `TextIOWrapper.read()` reads to EOF before it decodes, so the pipe is drained
    before the `UnicodeDecodeError` of N9.
- **128 + signal without recording the stopped run.**
  - [Observed] The "not recorded" half holds on every head stop path probed.
  - [Observed] The exit-status half does not hold on four paths (N8), and not under F4 (exit 1).

**Tool history** (rule 11 for my own records).
- `probe.py` grew between waves. Each batch summary names the tool digest it read at the batch's end. Three versions are kept:
  - `probe-wave1.py` (`bde424f6…`): E, the first G batch (in `probes/G-wave1/`), K and H;
  - `probe-wave2.py` (`58655c99…`): the wave-2 batches;
  - the final `probe.py` (`484618ae…`): RSTOP head/m1.
- The wave-3 version, used by P0, P0-np and the `-np` batches, is the final one without the `m1` lines. Reconstructed as
  `probe-wave3.py`, it hashes to `d9910d05…`, the digest those summaries name.
- One misattribution. The wave-2 G batch started under `58655c99…`. I edited the file during that batch, so its summary names
  `d9910d05…`. [Observed] Its 72 attempt records lack the `profile` field that `d9910d05…` adds, which confirms it ran
  `58655c99…`. The edit only added `--no-profile`, so a profiled batch behaves the same under both.
- `fake_npx.py` gained `badutf8` before wave 2. `run_probes.sh` gained `:np` before wave 3.

## 4. Round 2's findings

| Item | Verdict | Evidence |
|---|---|---|
| **F2**: a stop signal inside `Popen` orphans vitest | **Repaired** | Lines 33-35: the handlers only `stopped_by.append(number)`. Lines 113-117: `Popen`, then a reader thread and a poll loop that exits on `stopped_by`, after `proc` is bound. [Observed] The head is clean with 0 survivors in E 24/24, ET 18/18 and EARLYW 10/10. In 14 of those traced attempts the signal landed inside `Popen`, and the group was still ended. `r1` orphaned the whole tree in 33 of 52 (E 13/24, ET 13/18, EARLYW 7/10). Of the 20 traced failures, 19 raised inside `Popen`; one, in EARLYW, landed just after `Popen` returned. |
| **F3 (a)**: a second stop signal skips the cleanup | **Repaired** | No handler raises, and the `SIG_IGN` block is gone (lines 118-123). [Observed] Head G 63/63 and MIX 9/9 clean with 0 survivors. MIX's cleanup case sent 15, 16 and 31 signals; the handlers recorded 13, 15 and 31 of them before `SystemExit` left the script. `r1`: G 59/63 (4 dirty with a worker running) and MIX 3/9 (6 dirty). |
| **F3 (b)**: an unguarded first `killpg` skips the restore | **Repaired** | `end_group`'s `signal_group()` catches `ProcessLookupError` on both sends (lines 88-90). The `git checkout` sits in an inner `finally` (lines 120-123). [Observed] K head 2/2 (exit 0, 299/299, the injected answer followed by `KILLPG … 15 -> ESRCH`); `r1` 0/2. |
| **N7**: the SIGHUP handler overrides `nohup` | **Repaired** | Line 35 installs a handler only `if signal.getsignal(_signal) is not signal.SIG_IGN`. [Observed] H head 2/2 and H-np 1/1: exit 0, 299 tests; `r1` 0/2 (exit 129). |
| **Step 5**: the rule-6 record of E, G, K and H | **Repaired** | §3, by script. Commit, three script digests, parameters, attempts and denominators are stored. The `fix` is byte-identical to the head's script. The `round0`/`round1` bytes stay recoverable by `git show` as long as the PR lands by merge commit (guardrail on rebase-merge). The committed E cannot show where each `fix` attempt's signal landed. My ET adds that: 9 of 18 inside `Popen`. |
| **Step 6**: correct the docstring and the PR body | **Repaired for every case round 2 named** | Each flagged sentence is gone: "however it ends short of SIGKILL", "so no descendant outlives the run", "further stop signals are ignored during cleanup". The new ones (docstring lines 17-29, PR lines 13, 26-29, 47 and 132) hold for F2, F3 and N7. But two of them are false in cases round 2 did not probe: the restore claim under F4, and the exit-status claim under N8. |

## 5. New findings

### F4 — The restore still depends on `git checkout` succeeding, so a held index lock leaves both files instrumented (blocking)

**Severity:** medium. This is evidence tooling, not product. It is blocking under the brief's rule: "A script that can still leave
the tree dirty, or leave a descendant running, is blocking."

**Evidence:**
- [Observed] Line 123 restores with `subprocess.run(['git', 'checkout', '--', *written], cwd=tree, check=True,
  start_new_session=True)`. There is no fallback, and the script never re-checks the tree on a stop path: `leave_if_stopped()`
  exits at line 124 or 154, before line 155's `git status` check.
- [Observed] `git checkout -- <path>` takes `.git/index.lock`. In a scratch repository with the lock present, it printed
  "fatal: Unable to create '…/.git/index.lock': File exists." and exited 128, leaving the file modified.
- [Observed] `git status --porcelain --untracked-files=no` itself takes that lock when the index needs a stat refresh, which the
  instrumented writes cause. `strace` shows
  `openat(AT_FDCWD, "…/.git/index.lock", O_RDWR|O_CREAT|O_EXCL|O_CLOEXEC, 0666) = 3` and then the `rename` onto `index`.
- [Observed] LOCK (lock held, then SIGTERM): exit 1, both files " M", traceback ending in "subprocess.CalledProcessError:
  Command '['git', 'checkout', '--', 'packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts',
  'packages/polaris-generation-consent/src/package-reader.test.ts']' returned non-zero exit status 128." The vitest group had
  already ended: 0 survivors.
- [Observed] LOCKN (lock held, no signal): the profiled run completed, the restore failed the same way, the tree was left " M"
  ×2, and no OUT.json was written. A completed measurement is lost with it.
- [Observed] `dc60c5bc`'s script fails LOCK the same way, so this is not a regression of round 2. It is a case neither round's
  probes covered. The rewritten claims cover it:
  - docstring lines 23-26: "Cleanup, after every run however it ends short of a SIGKILL of the script: … each instrumented file
    that was written is restored with `git checkout`";
  - docstring lines 28-29: "It writes OUT.json and, only while a profiled run is in progress, the two instrumented files.";
  - PR body line 132: "Whenever a run ends short of a SIGKILL of the script itself (normally, by an exception, or by SIGINT,
    SIGTERM or SIGHUP, any number of them at any moment), it ends vitest's process group and then restores whichever file it
    wrote."
  - PR body line 26's "No exception can then arrive … inside the cleanup" is true of signal-raised exceptions only.

**Failure scenario:** syzygy-bpyt.4.24 tells lanes to measure five files with this script. A lane starts a long profiled
measurement in the background and keeps working in the same worktree. Its own `git status`, an editor's git integration or a
prompt's git segment refreshes the index just as a run ends. The restore fails, and both files stay instrumented. This is round
1's F1 consequence (a lane committing "all changes" ships the `spawnSync` wrapper into a helper with 46 call sites), behind a
traceback, with the completed run's data lost. [Inferred] The window is the length of one `git status` refresh in this
3,701-file tree, so likelihood grows with how often something polls git in that worktree. I did not reproduce a natural
collision, only the held lock.

**Proposed fix (for the follow-up bead, if `--profile` moves there):**
1. Keep the bytes `instrument()` read, and restore by writing them back. Use `git checkout` at most as a fallback. Writing the
   file back needs no index lock.
2. Before exiting on every path, including a stop, check `git status --porcelain --untracked-files=no` for the written paths and
   say so on failure.
3. Add LOCK and LOCKN to the rule-6 record. Each must fail against `72a0fabd…` and pass against the fix.

**Stopping-rule ruling.**
- **Where it lies:** in the stop handling of `--profile`, as the brief defines it ("the instrumentation, the signal handlers, the
  poll loop, `end_group`, the restore"). F4 is in the restore. It is reachable only with `--profile`: without it `written` stays
  empty and line 123 never runs.
- **The PR without `--profile` still meets its acceptance criteria.** [Observed]
  - The bead's fix is: "give each an explicit timeout sized from a measured worst case under load, or lighten their fixtures. Do
    not raise the global default."
  - The sizing inputs are `before-alone`, `before-full-1`, `before-full-2`, the load-127 extract and the two `after` records.
    None was made with `--profile`, and `before-profile.json` is not an input (`timeout-sizing.json` `inputs`).
  - `--check` holds at the head with 0 problems, and N1's R5 keeps the default at 5000 ms.
  - The bead's "profile those three tests" is met by `before-profile.json`. It is named by `0ef82cd0…`, `3e563ec4`'s script,
    and stays re-checkable there.
  - The coordinator's four scope rulings (testkit unchanged; size every test over 2.5 s; worst case × a stated margin; no
    assertion change) do not touch `--profile`.
  - The stop handling that remains holds without `--profile`: G-np 18/18, EARLYS-np 8/8, MIX-np 2/2, H-np 1/1, and P0-np exit 0
    with 299 tests. Its write set is OUT.json, the TemporaryDirectory, tempfile's probe and `/dev/null`.
- **What has to come out**, at `e7f3c71e`:
  - `scripts/measure_vitest_test_durations.py`:
    - line 4's ` [--profile]`;
    - docstring lines 12-15 (the `--profile` paragraph);
    - "before instrumenting, " on line 19;
    - lines 25-26 ("Then, even if ending the group raised, each instrumented file that was written is restored with `git
      checkout`, itself run in a session of its own so that a signal to the script's group cannot cut it short.");
    - lines 28-29, which become "It writes only OUT.json. A SIGKILL of the script itself can leave vitest running.";
    - `KIT_OLD`, `KIT_NEW`, `FILE_OLD` and `FILE_NEW` (lines 39-50);
    - `profile` and `'--profile' in args` on line 57;
    - `instrument()` (lines 63-72);
    - " and restored" in line 76's message;
    - `written` (line 109) and line 112;
    - the inner `try`/`finally` and the `git checkout`, lines 120 and 122-123 (line 121's `end_group` call stays);
    - the `PROF` parse and `run['profile']` (lines 131-132 and 137);
    - the `profile` and `instrumentation` keys of OUT.json (lines 147-148). `grep -F` finds neither word in
      `size_vitest_test_timeouts.py`'s code, so the sizing does not read them.
    - Optional: with no consumer of stdout left, vitest's stdout can go to `/dev/null` and the reader thread (lines 115-116)
      can go, which also retires N9.
  - What stays in the script:
    - the handlers (33-35), `leave_if_stopped` (74-78), `end_group` (80-96), the `Popen`, poll loop and `finally` (113-121);
    - line 61's clean-tree check, still needed so that `subject.fileSha256` describes the bytes that ran;
    - `TESTKIT`, still named in `subject`;
    - line 155's check, whose message "tree not restored" should be reworded.
  - Evidence files: `docs/evidence/syzygy-bpyt-4-13/measure-restore-probes.json` and
    `docs/evidence/syzygy-bpyt-4-13/tools/probe_measure_restore.py`. Every attempt in them runs `--profile` (the tool hard-codes
    it, line 110), and their `fix` would no longer be the head's script. They move with `--profile` to the follow-up bead.
    `before-profile.json` stays, as PR body line 49 says.
  - PR body:
    - line 13's instrumentation sentences and line 14's rule-6 bullet;
    - in "Round 2 repairs" (lines 22-47): the record paragraph and table (lines 30-46), and line 29's `git checkout` sentence.
      Keep its ESRCH half and lines 26-28 (handlers, poll loop, `/dev/null`), without "or inside the cleanup";
    - line 47's docstring sentence, to be reworded;
    - line 49, which becomes a record that the rule was applied;
    - line 132's clauses on the instrumented files and the restore.
  - Outside the PR: syzygy-bpyt.4.24's instruction says "with its F1 restore repair". That becomes moot once the sizing method
    no longer uses `--profile`. That is the coordinator's edit, not this PR's.

### N8 — The exit status is not always 128 + the first signal's number

**Severity:** low. The tree was clean with no survivor in every attempt below.

**Evidence:** [Observed] Of the head's 181 stop attempts, excluding H, 22 did not exit 128 + the first signal sent. Each is in
`probes-summary.txt`. The 181 is counted twice: by the summary's predicate (a signal sent, batch not H) over the records, and as
the sum of the stop batches' rows in that table.
- **Several signals pending at once: lowest-numbered first.** MIX's `run` bursts sent SIGTERM, SIGINT, SIGHUP, SIGINT and
  SIGTERM within 0.2–6.7 ms; its `write` bursts sent SIGINT, SIGTERM, SIGINT, SIGHUP and SIGTERM within 0.3–0.4 ms. Three of
  the six exited 129, each with `stopped [1, 2, 15]` traced: `run` 2 and 3, and `write` 1, whose first signal was SIGINT.
  [Inferred] CPython runs the handlers of pending signals in ascending signal number, so `stopped_by[0]` is not the first to
  arrive.
- **A stop signal during interpreter shutdown kills by the default action.** In MIX cleanup attempts 1 and 2, the trace logged
  "exit 130" (`SystemExit` leaving the script), and then the process died: status −15 and −2.
  [Inferred] Finalization restores the default dispositions before the process ends.
- **A real hangup gives 120.** PTY ×2: exit 120, where `r1` gives 129.
  - [Observed] `tools/pty_exit_check.py` reproduces the mechanism alone: a child that records SIGHUP, prints to its hung-up
    terminal and calls `sys.exit(129)` exits 120; without the print it exits 129 (`pty-exit-check.txt`: "print: exit 120",
    "noprint: exit 129").
  - So `leave_if_stopped()`'s `print(…, file=sys.stderr, flush=True)` turns a hangup's 129 into 120.
- **Before line 35 installs the handlers**, a signal kills by default, with status −15. This was EARLYS 0–150 ms (×11) and
  EARLYS-np 0–40 ms (×3). [Observed] None of the 14 has a trace line and every tree was clean. [Inferred] So the script died
  before its first `Popen` (the clean-tree `git status`), and wrote nothing.
- Under F4: exit 1.

The claims:
- Docstring lines 20-21: "the script exits 128 + the first signal's number".
- PR body line 27: "A stop ends the run in progress without recording it, and the script exits 128 + the first signal's number."
  Its "SIGINT now exits 130" holds for a lone SIGINT (I: 130).
- The lane's record checks no exit status for E, G, T or I, so it could not see this.

**Failure scenario:** a harness tells a deliberate stop from a crash by the exit status, as 4.24's lanes might. It reads 120
after a closed terminal, or −15 after a second stop, and reports a crash. Or it reads 129 and names SIGHUP for a run it stopped
with SIGTERM.

**Proposed fix:** either say what holds, or make the status hold. Then add exit-status checks to the probe record (MIX, PTY).
- Docstring wording: "exits 128 + the number of a stop signal it received (the lowest-numbered when several arrive together);
  one that arrives during start-up or shutdown can kill it instead."
- Or code: wrap the `leave_if_stopped` print in `try/except OSError`, and end the stop path with `os._exit(128 + n)` once the
  cleanup and OUT.json are done.

### N9 — The reader thread swallows its own exception: a decode error now yields exit 0 and an empty profile

**Severity:** low. [Inferred] vitest writes UTF-8, so the trigger is unlikely.

**Evidence:**
- [Observed] Line 115's thread runs `output.append(proc.stdout.read())` on a text-mode pipe. Any exception there is printed by
  `threading` and otherwise lost. The loop then sees the thread dead and the process exited, and the run is parsed from
  `stdout = ''` (line 127).
- [Observed] BADUTF8, head: exit 0. The script's own line was "run 1: exit 0, 0.3 s, load1 {…}, 0 tests of the file, 0 failed".
  The record has 0 profile rows, though the child wrote one `PROF` line. Stderr shows "UnicodeDecodeError: 'utf-8' codec can't
  decode byte 0xff in position 23: invalid start byte" inside the thread.
- [Observed] `dc60c5bc`'s script, same input: exit 1, the same error raised from `proc.communicate()`, no record.

So the round-2 repair turned a loud failure into a recorded run with missing data.

**Failure scenario:** a profiled run whose test output carries a stray non-UTF-8 byte is committed as evidence with `profile: []`,
and exit 0 tells nobody.

**Proposed fix:**
- Pass `errors='replace'` to `Popen`, or read bytes and decode with `errors='replace'`.
- And/or have the thread store any exception, and re-raise it in the main thread after the loop.
- Under the stopping rule, dropping the reader (see F4) removes this.

### N10 — PR body line 144 says "main unchanged at `df6046a1`"

**Severity:** low.

**Evidence:** [Observed] At review time `ls-remote` gave main `71334012`. It changes 116 paths since `df6046a1`, none a subject
path and none in the consent package (§1). The sentence means that the branch has not merged main since `df6046a1`, which is
true. As written, though, it says main has not moved.

**Proposed fix:** "main last merged at `df6046a1`; main has since moved to `<sha>` and changes no subject path".

## 6. Every changed output, or the evidence that there is none

- **Product.** [Observed] Since round 2 no file under `apps/**` or `packages/**` changes. The test file is byte-identical, with the
  16 timeouts equal. None of `vitest.config.ts`, the testkit, any `package.json`, `.syzygy/**`, `openspec/**` or a workflow is a
  subject path (§1).
- **GP-Q0's list.**
  - No product's rendered byte, wire format, refusal string or exit code changes.
  - No signed or digest-bound artifact changes. [Observed] The 10 citers of the two names (§2) are evidence files and scripts,
    none a manifest under `.syzygy/` or `openspec/`.
  - No consent, security or retention decision changes.
- **What a gate accepts or refuses.** [Observed] Unchanged. No battery step or workflow runs either evidence script (§2), the
  battery is "commands=110 nonzero=0" at the head, and the vitest verdict rests on the same 16 timeouts as round 2.
- **The evidence tools' own outputs.** Changed, as intended or as found:
  - a stop no longer orphans vitest (F2), a second stop no longer skips the cleanup (F3 (a)), and an ESRCH no longer skips the
    restore (F3 (b));
  - `nohup` protects a run again (N7);
  - stop statuses are 128 + n in the lone-signal case: SIGINT 130 where `dc60c5bc` died by −2. N8 lists the other statuses;
  - a stop prints "stopped by SIG…: the run in progress, if any, was ended and restored and is not recorded" to stderr;
  - vitest's stderr goes to `/dev/null`;
  - a decode error now yields exit 0 with no profile rows (N9);
  - a failed `git checkout` still leaves the files written (F4).
- **Evidence.** `measure-restore-probes.json` is regenerated (schema 2, 122 results), and `probe_measure_restore.py` is rewritten.
  No duration or sizing record changed. `check_governance` and `check_quotations` stay clean.

## 7. Verdict per acceptance criterion

The bead has no `acceptance_criteria` field (`bd show syzygy-bpyt.4.13 --json`: `None`). I judge against its "Fix" sentence, the
brief and round 2's repair list.

| Criterion | Verdict | Basis |
|---|---|---|
| F2: no stop orphans vitest | Met | §4; 52 head E/ET/EARLYW attempts clean, 0 survivors |
| F3 (a): a second stop cannot skip the cleanup | Met | G 63/63, MIX 9/9 |
| F3 (b): ESRCH cannot skip the restore | Met | K 2/2 |
| N7: an inherited `SIG_IGN` stays ignored | Met | H 2/2, H-np 1/1 |
| Step 5: rule-6 record, E/G/K/H failing `round1` and passing `fix`, with commit, digests, attempts, denominators | Met | §3, by script |
| Step 6: the claims say what the script does | **Not met in full** | Met for round 2's cases; false under F4 (restore) and N8 (exit status) |
| The restore holds however a run ends short of a SIGKILL | **Not met** | F4: LOCK and LOCKN |
| No descendant outlives a run, save the documented out-of-group case | Met | 196 head attempts, one survivor, DETACH |
| The script writes only OUT.json and the two instrumented files | Met, except that F4 leaves them written | P0 ×2 and P0-np under `strace` |
| No assertion or timeout moved since round 2 | Met | test file byte-identical; 16 of 16 timeouts equal |
| `size_vitest_test_timeouts.py --check` gives the PR's line | Met | "299 collected, 16 sized (10 from a lower bound), 0 problems" |
| The bead's fix: explicit timeouts sized from a worst case under load, global default not raised | Met | unchanged since round 2; check reproduced; file passes 299/299 at load1 31–49 |
| PR body claims | Met except lines 26 (in part), 27, 132 and 144 | Lines 5, 13-15, 19, 28-29, 30-46, 48 and 151-152 reproduced, including "commands=110 nonzero=0" at `e7f3c71e`. Line 146's load and line 147's project run are the lane's. Lines 26, 132 (F4), 27 (N8) and 144 (N10) are not. |
| Class ruling none | Confirmed | §2 |

## 8. Cleanup

- **Deleted.**
  - Both scratch clones, `rev-520c/clone` and `rev-520c/clone2`, after `git status --porcelain --untracked-files=no` showed each
    clean and no `.git/index.lock` was left.
  - Every TMPDIR I made: `/tmp/r520c-npm`, `-npm2`, `-size`, `-gitlock`, `-gates`, `-file` and `-battery`, plus each probe
    attempt's own `/tmp/r520c-*`, which the probe removed. [Observed] `ls -d /tmp/r520c-*` returns "No such file or
    directory".
  - Nothing outside my own TMPDIRs was deleted.
- **Processes.** Every survivor was sent SIGKILL by PID, taken from my probe's own `/proc` walk, its seen groups or its
  cwd-in-clone scan. No kill was by name or pattern. [Observed] Before deleting the clones, `tools/cwd_census.py` gave "processes 1798,
  cwd unreadable 1665, cwd under prefix 0" for `rev-520c/`. [Inferred] A cwd is unreadable only for another user's process, so
  none of the 1,665 can be mine.
- **Nothing pushed, commented or merged.** No bead was changed (`bd show` only). No worktree under
  `/home/tze/GitHub/syzygy/.worktrees/` was touched.
- **Kept**, all under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-520c/`.
  `KEPT-FILES.sha256` lists every kept file with its sha256, except this raw and itself. Its own sha256, its file count, and the
  digests of the tools and of the main result files are given in the coordinator message that carries this raw, since writing
  them here would change this file's digest.
  - **Tools** (`tools/`):
    - `check_identity.py`, `check_probe_record.py`, `check_test_file.py`;
    - `probe.py` (final), `probe-wave1.py`, `probe-wave2.py`, `probe-wave3.py` (reconstructed, `d9910d05…`);
    - `inject.py`, `fake_npx.py`, `fake_git.py`, `run_probes.sh`, `summarize_probes.py`, `pty_exit_check.py`, `battery.py`, `cwd_census.py`.
  - **Tool inputs and logs** (`tools/`):
    - `r1_measure_vitest_test_durations.py` (`920c5f12…`), `m1_measure_vitest_test_durations.py` (`e8b6c205…`);
    - `rederived-review.diff`, `rederived-delta.diff`, `subject-paths.txt`, `main-changed-71334012.txt`, `npm-ci.log`,
      `npm-ci-clone2.log`.
  - **Results** (`rev-520c/`):
    - `check-identity.txt`, `check-probe-record.txt`, `check-test-file.txt`, `pr-body.md` (the body as fetched);
    - `sizing-check-head.json` and `.log`, `file-run-head.log`, `file-run-head.report.json`;
    - `typecheck.log`, `check-governance.log`, `check-quotations.log`, `battery.log`, `battery.json`;
    - `probes-summary.txt`, `pty-exit-check.txt`, and `probes-wave1.log` … `probes-wave4.log`.
  - **Probe records** (`probes/`): one JSON per attempt under `probes/<batch>/`, a `<batch>-summary.json` per batch, and the
    wave-2 P0 record as `probes/P0-wave2-head-None-1.json`.
