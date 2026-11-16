# R-GP-IMPL-FIXTURE-PID-SWEEP-2 — CC-REV-1 implementation review of syzygy-bpyt.4.10, round 2
Verdict: REVISE
Reviewed commit: 564ec47c
Subject: r2-review.diff sha256 809899094eee9ebbb60d07a47900b3d512d167c80c15d7992767a99edc5ffd1d

Reviewer: rev-509b, fresh context. I did not author the change or round 1. Date 2026-10-22. Full reviewed commit
`564ec47c79e855fed1a4807ebef6f9c82567dc6b`, base `9a30237ed700e6579f3fcc1c6292e6c759861c3f`, PR #509, bead
`syzygy-bpyt.4.10`. This is a fresh review of the whole diff. Every suite and probe ran with a short private TMPDIR
(`/tmp/r509b-<n>`). No run or probe of the sweep was given the shared `/tmp`. New findings continue round 1's
numbering (F5, N7 onwards), so that no id means two things.

## 1. Subject identity checks

- [Observed] `sha256sum r2-review.diff` gives `809899094eee9ebbb60d07a47900b3d512d167c80c15d7992767a99edc5ffd1d`.
- [Observed] In my clone, `git diff 9a30237e… 564ec47c… --output=rederived.diff` hashes to the same value.
  **The digest matches**, and the subject file is byte-identical to the diff.
- [Observed] `git merge-base 564ec47c 9a30237e` is `9a30237ed700e6579f3fcc1c6292e6c759861c3f`.
- [Observed] `git ls-remote origin` at 16:44 local: `refs/heads/agent/syzygy-bpyt.4.10` is `564ec47c…` and
  `refs/heads/main` is `9a30237e…`. `gh pr view 509`: `headRefOid` `564ec47c…`, state OPEN.
- [Observed] The diff has 34 files. 27 are under `docs/evidence/poc-fixture-leak-2026-10-22/`. The other 7 are the 7
  the brief names. 0 are under `.syzygy/` or `openspec/` (a Python filter over `git diff --name-only`).
- [Observed] **The evidence's code commit is code-identical to the subject.** The evidence records name `3f08143c…`
  as their code commit. `git diff --name-only 3f08143c 564ec47c -- apps packages scripts vitest.config.ts
  package.json package-lock.json vitest.setup.ts` lists 6 files, none under `apps/`: 3 under `packages/` and 3 under
  `scripts/`. All 6 come from main's merges, and none is in the subject diff.
  - At `564ec47c` the six source files that `mutants-sweep` hashes are byte-equal to its `sha256AtCommit`. For
    example, `fixture-directories.ts` is `329b3fc4…252aac959c`.
  - `polaris-accessibility-main.ts` hashes to `5eb9f3ad…88e6b4db`, the digest in both `cli-sweep-probe` records.

## 2. Clauses relied on (quoted), and the class ruling

- **CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`):
  - Lines 18-20: "Changes touching any of seven classes require review by an independent, fresh-context reviewer,
    and the agent performing the change never finally decides which classes it touches."
  - Line 37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - Lines 40-41: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external
    consumer can depend on;"
  - Line 51: "**A reviewer or the owner** may reclassify at any time."
- **SEC-4** (`.syzygy/governance/doctrine/security.md:112-114`): "**SEC-4 — Writes are consented, attributed, and
  revertable.** Syzygy writes into a governed repository only with recorded consent, and every write can be traced
  and undone."
- **GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
  - Lines 52-55, four list lines joined: "\"Behavior-preserving\" means none of the following changes: / a rendered
    byte, a wire format, a refusal string or an exit code; / a signed or digest-bound artifact; / a consent,
    security or retention decision."
  - Line 62: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic
    observation) or class 4 (security), and class-6 pull requests that remove an endpoint."
- **AGENTS.md** at `564ec47c`:
  - Rule 6 (line 126): "Mutate the input and confirm the check fails, per predicate, before trusting it".
  - Rule 9 (line 132): "A claim of absence needs a sweep with a denominator."
  - Rule 11 (lines 134-135): "An evidence record names its subject and the subject's digest; a record that names
    neither cannot be re-checked against the bytes it describes."
  - Guardrail (line 263): "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it
    ran at".
  - Guardrail (lines 271-272): "Fail-closed polarity: withdrawal defeats grant; future-dated evidence is stale; no
    evidence → Unknown."
- **The bead** (`bd show syzygy-bpyt.4.10`), acceptance criteria: "1. Diagnosis recorded with its commit: a clean
  three-surface-poc-app run with a fresh TMPDIR leaves 0; the 42 helper-using files alone leave 0; 0 of 39 callers
  fail to drain; killed runs (SIGKILL, SIGTERM) leak; the /tmp population's mtime bursts. 2. Fixture copies and
  templates carry the owner PID; a once-per-run sweep removes only PID-named fixture directories whose PID is dead
  (ESRCH), never a live PID, never a legacy name. 3. SIGKILL a run, then one fresh run: 0 dead-PID fixture
  directories remain; rule-6 mutant with the sweep disabled leaves them (recorded). 4. Tests show a live-PID
  directory and a legacy-name directory survive the sweep. 5. Suite green; Tests: +a ~b -c; class none."
  - Bead comment (coordinator, 2026-10-21 22:37): "the fix is PID-named fixture directories plus a once-per-run
    sweep of dead-PID directories."
- **The coordinator's rulings** as the brief gives them: "drop the per-file hook (the bead comment); name directories
  by owner pid and sweep dead pids once per run; sweep only the run's own TMPDIR; follow no symlinks; EPERM counts as
  alive; never remove a live pid's or a legacy (no-pid) name".
- **The brief's verdict rule**: "A path by which the sweep could delete a directory it did not create is blocking,
  and so is an unrepaired round-1 F."
- **Test-rigor bar** (`th-engineering/subskills/test-rigor/SKILL.md`):
  - Core rule: "A test is worth keeping only if some plausible bug makes it fail."
  - Item 3: "Edge and failure paths are first-class — Empty inputs, boundaries, invalid states, error branches, and
    concurrency-sensitive paths get tests proportional to blast radius."
  - Item 4: "Expected values are literals or independently derived."
  - Item 6: "Deterministic or quarantined".

**Class ruling (mine): none.** The change is test support, plus one operator CLI that now removes dead runs'
fixture directories at its start.
- I considered whether that CLI deletion changes the class. **It does not.**
  - Class 4 covers "anything under SEC-1…SEC-5". SEC-4's scope is writes "into a governed repository". The CLI
    removes host scratch directories under its own temp directory. It writes nothing into a governed repository. It
    adds no auth surface and no egress path.
  - Class 6: the CLI's stdout lines, stderr message, exit codes (0, 1, 2) and evidence JSON are unchanged (section
    6). Nothing an external consumer can depend on changes.
  - The daemon does not import the new module. Its tracked importers are the global setup, the CLI, the fixture
    helper and two test files (a `git grep -l` over `apps packages scripts` gives 5 files).
  - Classes 1, 2, 3, 5 and 7 are not touched.
- **GP-Q0's three extra checks do not apply.** They cover classes 1, 3 and 4 and class-6 pull requests that remove an
  endpoint, and none is touched.
- Under GP-Q0's list, no rendered byte, wire format, refusal string, exit code or digest-bound artifact changes. The
  cleanup of synthetic test fixtures is not a consent, security or retention decision about governed or observed
  data. I judge deletion safety under the brief's verdict rule, as round 1 did.

## 3. What I ran and the results

Two scratch clones of `564ec47c` were used: `clone` (typecheck, suites, CLI) and `mut` (mutants, kill probe).
- `npm ci` printed "added 115 packages, and audited 126 packages in 10s" in the first, and the same with "in 18s" in
  the second.
- Node v24.6.0, Vitest 3.2.7, bwrap at `/usr/bin/bwrap`.
- Load average was 66–78 on 12 cores throughout.

| # | Run (cwd = a clone) | Result [Observed, verbatim where quoted] |
|---|---|---|
| 1 | `npm run typecheck` | printed only the `tsc -b …` line; exit 0 |
| 2 | `fixture-directories.test.ts` + `test-model-fixture.test.ts`, TMPDIR=/tmp/r509b-1 | " Test Files  2 passed (2)" / "      Tests  19 passed (19)"; TMPDIR left only `node-compile-cache` |
| 3 | App project, TMPDIR=/tmp/r509b-2 | " Test Files  4 failed \| 85 passed \| 1 skipped (90)" / "      Tests  4 failed \| 1107 passed \| 2 skipped (1113)" / "Duration  509.25s"; exit 1. The failures are 4 × "Test timed out in 5000ms." and one suite error, "private browser profile drain did not verify two empty scans before deadline" (`trajectory-narrowing.browser.test.ts`). The two subject test files passed (14 and 5 tests). **0 fixture directories left**; the TMPDIR held 2 `.com.google.Chrome.*`, `node-compile-cache` and `syzygy-poc-browser-ajELi2` |
| 4 | The 4 failing files alone, default timeouts, TMPDIR=/tmp/r509b-7 | " Test Files  3 failed \| 1 passed (4)" / "      Tests  3 failed \| 57 passed (60)". `trajectory-narrowing.browser` passed. The other 3 failed again, each on "Test timed out in 5000ms." |
| 5 | Those 3 with `--testTimeout=120000`, TMPDIR=/tmp/r509b-11 | " Test Files  3 passed (3)" / "      Tests  58 passed (58)"; exit 0. So the failures in run 3 were time limits, not assertions |
| 6 | Hosted CI at `564ec47c` (`gh run view 39741700085`, node-ci, `pull_request`, headSha `564ec47c…`) | conclusion `success`; "Test Files  233 passed \| 3 skipped (236)", "Tests  5124 passed \| 5 skipped (5129)"; system tier "Test Files  9 passed (9)", "Tests  48 passed (48)"; "fixture-directories.test.ts (14 tests) 482ms". governance-docs run 39741700206: `success` |
| 7 | `python3 scripts/check_governance.py` | "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted"; exit 0 |
| 8 | Lane's `mutate_sweep.py` re-run in `mut` (TMPDIR=/tmp/r509b-12) | "control True 19 0"; all 22 mutants "killed"; "survivors: []". My re-run matches the committed `mutants-sweep` record mutant by mutant: same ids, edits and outcomes, and the same set of failing tests. The one exception is `stat-follows-symlink`, where the committed record also lists a load-bound `STACK_TRACE_ERROR` in another test. The six source digests are equal. `/tmp/r509b-12` was empty afterwards (N3) |
| 9 | Reviewer's `my_mutants.py` in `mut` (TMPDIR=/tmp/r509b-5). A mutant counts as killed only when a named test fails | control 19 passed, 0 left; **6 of 7 killed**, 1 survived (section 8, N8). Files restored and sha256-checked |
| 10 | Reviewer's `ns_probe.py`, 3 live holders and 3 sweepers across PID namespaces (`/tmp/r509b-3`) | F1 repaired where `/proc` is readable; **F5** where it is not (section 4 F1, section 5 F5) |
| 11 | Reviewer's `foreign_owner_probe.py`: a really foreign-owned directory, through a user namespace (`/tmp/r509b-10`) | the uid guard holds (section 4 F3) |
| 12 | Reviewer's `race_probe.mjs`: 3 rounds × 4 concurrent sweepers × 150 dead and 3 live directories (`/tmp/r509b-9`) | 12 of 12 sweepers exited 0 with empty stderr; 0 of 450 dead directories left; 9 of 9 live kept |
| 13 | Reviewer's `kill_probe.py` in `mut` (TMPDIR=/tmp/r509b-6): SIGKILL at 3 copies, then one fresh app-project run under a preload that logs every `readdirSync` of exactly the TMPDIR | AC3 and F2 (detail below) |
| 14 | Reviewer's `cli_probe.py`: the built CLI against a seeded TMPDIR (`/tmp/r509b-13`) | exit 2, removed only the 2 dead-pid directories of its own namespace (section 4 F2) |
| 15 | Vitest itself inside `bwrap --unshare-pid --tmpfs /proc` (TMPDIR=/tmp/r509b-14) | `fixture-directories.test.ts (14 tests)` passed. Vitest then did not exit for over 10 minutes. A `/proc` scan listed 10 processes with that TMPDIR marker; I sent SIGKILL by pid to 9 after re-reading each marker, and the tenth (the inner bwrap) had already exited (exit 137) |
| 16 | Records read by script (`check_records.py`), never whole | 18 JSON records; N9 |
| 17 | Read-only host checks | `/proc/self/ns/pid` is `pid:[4026531836]`; `findmnt -T /tmp` gives "/tmp   tmpfs  tmpfs"; `pid_max` 4194304; the Claude Code 2.1.307 binary contains `"--proc","/proc","--dev","/dev",…` |

**Run 13 detail** [Observed, `kill-probe.json` sha256 `af0336b0…a748c8b4e9`, `treeCommit` `564ec47c…`, the four
code digests recorded]:
- The app project started in a new session. At 24.8 s three copies existed, and SIGKILL went to that session's
  process group.
- Five seconds later the TMPDIR held **6 dead-pid directories**: 3 copies and 3 templates of owners 3483863, 3483873
  and 3483882, all `n4026531836`. There were 0 live, 0 foreign and 0 legacy, and 0 processes still named the
  TMPDIR.
- The fresh run printed " Test Files  1 failed | 88 passed | 1 skipped (90)" and "      Tests  1 failed | 1110
  passed | 2 skipped (1113)". The failure is `build-output.test.ts`, "Test timed out in 240000ms." Afterwards there
  were **0 dead-pid directories**, 0 live and 0 legacy.
- The preload logged **exactly 1** `readdirSync` of the TMPDIR during the whole fresh run, from pid 3486777, whose
  argv is `…/mut/node_modules/.bin/vitest run --project`: the Vitest main process. No worker listed the TMPDIR.

## 4. Round 1's findings

### F1 (blocking) — the liveness test could not see other PID namespaces: **repaired where `/proc` is readable**

- [Observed] Names carry the namespace: `ownedCopyPrefix()` is
  `` `${FIXTURE_PREFIX}p${process.pid}-n${pidNamespace()}-` `` (`fixture-directories.ts:12`). The sweep skips any
  name whose namespace segment is not its own: `owner[2] !== namespace` (line 61). There is no age floor, and the PR
  residual says so ("There is no age floor").
- [Observed] Test `keeps the directories of a dead pid that belong to another PID namespace`. The lane's mutant
  `foreign-namespace-swept` is killed by it (re-run 8), and so is my `namespace-ignored` (same fragment, run 9).
- [Observed] **Round 1's probe, reproduced and extended** (`ns_probe.py`, `ns-probe.json` sha256
  `670b366f…b0e2eafb`, module sha256 `3a3067a6…fa8db231`, which is the `dist` file `tsc` built from the reviewed
  source). Three live holders each made one copy with the reviewed `ownedCopyPrefix()`. Each sandboxed holder's
  inner pid was pushed to 63 by 60 `/bin/true` forks first. Without that, pid 5 answered "alive" inside the sweeper's
  sandbox in my first run, by coincidence. The sweeper was pid 2 and the child it reaped got pid 9, so pids 3–8 were
  its own threads [Inferred].
  - host: `syzygy-poc-surface-fixture-p3427640-n4026531836-6naqAQ`;
  - `bwrap --unshare-user --unshare-pid --dev-bind / / --proc /proc`: `…-p63-n4026539592-1nKGuu`;
  - the same with `--tmpfs /proc` in place of `--proc /proc`: `…-p63-n0-H05SvL`.

  The sweepers ran in turn:
  - The `--proc` sweeper (round 1's configuration) printed "ns pid:[4026539621] signal0 {'63': 'ESRCH', '3427640':
    'ESRCH'} removed ['syzygy-poc-surface-fixture-p9-n4026539621-CTRL01']". It saw both live owners as ESRCH and
    still kept both of their directories, removing only its own dead-pid control. Round 1 recorded
    `"liveDirectoryAfterInnerSweep": "REMOVED"` for this case. **That path is closed.**
  - The host sweeper kept all three holders' directories and removed its own control.
- **But the `0` fallback reopens the same class wherever `/proc/self/ns/pid` cannot be read.** The `--tmpfs /proc`
  sweeper printed "ns unreadable:ENOENT signal0 {'63': 'ESRCH', '3427640': 'ESRCH'} removed
  ['syzygy-poc-surface-fixture-p63-n0-H05SvL', 'syzygy-poc-surface-fixture-p9-n0-CTRL01']". The live `--tmpfs`
  holder recorded `"goneWhileAlive": true`, `"goneAfterMs": 3378`, and stopped normally at 4149 ms with exit 0. That
  is new finding **F5**.
- **Verdict: repaired** for every namespace whose `/proc` is readable. It is not repaired for the `n0` population,
  which is a new defect of the repair and is filed as F5, not as round-1 F1 unrepaired.

### F2 — once per run: **repaired**

- [Observed] `vitest.config.ts:80-81` registers `test-fixture-sweep.global-setup.ts` as the app project's only
  `globalSetup`. No root key and no other project has one, and the test `is registered as a global setup of the app
  project and of no other project` pins this. The fixture helper no longer sweeps: the lane's `sweep-per-file` mutant is
  killed by test `does not sweep when a file makes its template` (run 8).
- [Observed] Instrumented count (run 13): a full app-project run listed its TMPDIR exactly once, from the Vitest
  main process, not 42 times from 42 workers as round 1 measured.
- [Observed] The CLI calls the sweep as the first statement of `main()`
  (`polaris-accessibility-main.ts:25-27`). `cli_probe.py` ran `dist/polaris-accessibility-main.js` with a PATH
  holding only node, so no browser was found and nothing was measured. It printed exit 2 and the unchanged stderr
  line "No Chrome/Chromium found on PATH and SYZYGY_POC_BROWSER is unset; nothing measured.".
  - It removed exactly `…-p3575567-n4026531836-DEAD01` and `…-template-p3575567-n4026531836-DEAD02`.
  - It kept a live-pid copy, a dead pid of another namespace, a pid with no namespace segment, two legacy names, an
    `n0` dead-pid directory, a regular file and a symlink at dead-pid names, and the symlink's target.
  - It wrote no evidence file (`cli-probe.json` sha256 `970c9551…40256193`).
- **What a CLI user can lose**: only entries in `os.tmpdir()` that match
  `^syzygy-poc-surface-fixture-(?:template-)?p(\d+)-n(\d+)-`, carry the CLI's own namespace inode, answer ESRCH, are
  directories under `lstat` and belong to the user. Apart from F5, that population is dead runs' fixtures
  [Inferred from the code and runs 10–14].

### F3 (blocking) — `lstat`, `isDirectory()` and the uid before removal: **repaired**

- [Observed] `fixture-directories.ts:63-65`: `const stat = lstatSync(entry); if (stat.isDirectory() && (user ===
  undefined || stat.uid === user)) rmSync(…)`, inside a `try`. `user` is `process.getuid()` where that is a
  function (line 58).
- [Observed] Test `follows no symlink and removes no file` keeps a symlink and a regular file at dead-pid names, and
  the symlink's target. Test `keeps a directory that belongs to another user` (with `getuid` spied) and test
  `checks no user where the system has no user ids` cover the uid guard.
- [Observed] Mutants:
  - the lane's `is-directory-guard-dropped`, `uid-guard-dropped` and `stat-follows-symlink` are killed (run 8);
  - my re-runs of the first two with the same fragments are killed by the named tests (run 9);
  - so are my `uid-compare-inverted` (7 tests fail) and `no-uid-means-keep`.
- [Observed] **Beyond the spy: a directory another user really owns** (`foreign_owner_probe.py`,
  `foreign-owner-probe.json` sha256 `f85a110f…32f05669`).
  - Inside `bwrap --unshare-user` (host PID namespace), the root-owned `/usr/share/doc/bash` was mounted read-only at
    `…-p3520297-n4026531836-ROOT01` in a private directory. It lstat's there as `"uidSeen":65534` against
    `"getuid":1000`. Beside it sat a dead-pid directory the sweeper owns. A preload logged every `rmSync` path.
  - The reviewed module called `rmSync` for `…MINE01` only.
  - A copy with the uid guard dropped also called it for `…ROOT01`. The read-only mount refused it: "entries
    inside" was 13 before and 13 after, and `/usr/share/doc/bash` still holds 13 entries.
- **Verdict: repaired.**

### F4 — SIGTERM record: **repaired**

- [Observed] Three records carry the TERM signal:
  - `interrupt-term-base` (treeCommit `0d4d50984f6a…`): at the signal, 3 copies and 3 templates; 80 s later, 3 copies
    and 3 templates are still there.
  - `interrupt-term-head` (`3f08143c…`): 3 copies and 2 templates at the signal, and the same 80 s later.
  - `term-then-fresh-run-head`: 5 dead-pid directories 5 s after SIGTERM; the fresh run left
    `"ofDeadProcesses": {"count": 0…}`.
- I did not re-run SIGTERM myself; run 13 is SIGKILL.

### N1 — `readdirSync` outside the `try`: **repaired**

- [Observed] `fixture-directories.ts:51-56` wraps the listing in a `try` that returns. Test `does not fail the run
  when the temp directory cannot be listed` uses `chmodSync(tmp, 0o333)` and an absent directory. The lane's
  `readdir-outside-try` mutant is killed with "expected [Function] to not throw an error but 'Error: EACCES:
  permission d…" (record and run 8).

### N2 — the PR body's foreign-owner claim: **repaired**

- [Observed] The PR body's table now says "the uid guard is tested with a spy on `process.getuid`; no second user id
  was available, so no real foreign-owned directory was made", and a residual repeats it. The behaviour claim ("…
  another user's directory … are all kept") is now true of the code, and the foreign-owner probe confirms it.

### N3 — `mutate_sweep.py` hygiene: **repaired**

- [Observed] Line 4 reads "Usage: mutate_sweep.py <worktree> <out.json> <private-tmpdir>". Line 140 is
  `shutil.rmtree(report.parent, ignore_errors=True)` in the final `finally`. After my re-run (8), `ls -la
  /tmp/r509b-12` showed only `.` and `..`.

### N4, N5, N6

- N4 (orphan processes) is out of scope (`syzygy-bpyt.4.14`). [Observed] My SIGKILL at 24.8 s left 0 processes naming
  the TMPDIR, so it did not reproduce here.
- N5 was ratified by the coordinator.
- N6 is covered by the tests above, except the gaps in N8 and F5.

## 5. New findings

### F5 — blocking — the `0` fallback treats every PID namespace without a readable `/proc` as one namespace, so a sweep there removes a live run's directories

- **Severity:** blocking under the brief's rule ("A path by which the sweep could delete a directory it did not
  create is blocking"). It also breaks AC2's "never a live PID".
  - The blast radius is the same as round-1 F1. A concurrent run loses its fixture repositories mid-test. Only
    entries of the sweeper's own uid, named with this prefix and `n0`, are reachable.
  - The likelihood is low. Claude Code's own sandbox passes `"--proc","/proc"` (in the 2.1.307 binary), and
    container runtimes mount `/proc` as standard [Inferred]. But the path is real and reproduced.
- **Evidence:**
  - [Observed] `pidNamespace()` (`fixture-directories.ts:21-27`) returns `'0'` whenever `readlinkSync('/proc/self/ns/pid')`
    throws. Its doc comment says "`0` where there is no `/proc` entry, which is one namespace by itself" (line 19).
    That holds on macOS. On Linux, every PID namespace without a readable `/proc` reads as the same `0`.
  - [Observed] `ns_probe.py` (section 4, F1):
    - A holder in `bwrap --unshare-user --unshare-pid --dev-bind / / --tmpfs /proc` made
      `syzygy-poc-surface-fixture-p63-n0-H05SvL` and stayed alive.
    - A sweeper in a second sandbox of the same shape saw pid 63 as ESRCH in its own namespace, and removed that
      directory 3.4 s into the holder's life (`"goneWhileAlive": true`).
  - [Observed] The cross cases are safe. The `0` sweeper kept both non-`0` live directories, and the `--proc` and
    host sweepers kept the `n0` one. A `0` sweeper never removes a non-`0` name, nor the reverse, because the
    segment comparison is an exact string match.
  - [Observed] Node and Vitest run in such a sandbox: run 15 passed `fixture-directories.test.ts` there, and its
    `ownNamespace()` also returns `0`. The run then did not exit (stopped by pid).
  - [Observed] No test exercises an unreadable namespace, and no mutant changes the fallback. In the three bead files,
    `git grep -F "'0'"` finds the literal only at `fixture-directories.ts:23,25` and in each test file's own
    `ownNamespace()` (lines 14 and 16). The only mocks there are of `process.kill`, `process.getuid` and `node:os`.
  - [Observed] The PR body gives the fallback without its hazard: "`<namespace>` is the inode of `/proc/self/ns/pid`
    (`0` where `/proc` has none)". No residual names it.
- **Failure scenario:** two sandboxed lanes share `TMPDIR`. Each runs the app project under `bwrap --unshare-pid` (or
  another PID-namespace sandbox) without mounting `/proc`. Lane A's worker, pid 40 in A's namespace, makes
  `…-p40-n0-…`. Lane B's global setup runs. In B's namespace pid 40 does not exist, the name's namespace `0` equals
  B's `0`, and the directory is B's uid's, so B removes A's live template and copies. A then fails in `cpSync` or git
  with ENOENT. It is the scenario round-1 F1 described, now limited to sandboxes without `/proc`.
- **Proposed fix** (fail closed: no namespace reading is no evidence, so the sweep removes nothing):
  1. Have `pidNamespace()` return `undefined` when the link cannot be read. Keep naming with `n${pidNamespace() ??
     '0'}`, so such names stay recognisable.
  2. In `removeFixturesOfDeadProcesses`, return before the loop when the reading is `undefined`. If the macOS leak
     matters, make that `process.platform === 'linux'` only. Linux is the platform with PID namespaces here
     [Inferred]; FreeBSD jails are the other known case, so the platform-agnostic form is the safer one.
  3. Correct the doc comment at line 19 and the PR body's `0` sentence. Add a residual: a run without a readable
     `/proc` never sweeps.
  4. Test: mock `node:fs` so `readlinkSync('/proc/self/ns/pid')` throws (the file already uses `vi.doMock` for
     `node:os`), make a dead-pid `n0` directory, and assert it survives. A rule-6 mutant that drops the early return
     must fail that test.

### N7 — note — the host PID namespace's inode is the same number on every Linux kernel

- **Evidence:**
  - [Observed] Here `/proc/self/ns/pid` is `pid:[4026531836]`, and `0xEFFFFFFC` is 4026531836. [Inferred from the
    kernel's `PROC_PID_INIT_INO` constant] Every Linux host's initial PID namespace has this inode, and container
    namespaces get small per-boot numbers.
  - [Inferred] So the `n<inode>` segment identifies a namespace only within one running kernel. Two kernels that
    share a TMPDIR would each judge the other's live pids locally: an NFS-mounted TMPDIR, or a VM sharing a host
    directory as its TMPDIR.
  - [Observed] On this host, `/tmp` is a local tmpfs (`findmnt -T /tmp` gives "/tmp   tmpfs  tmpfs"), so the default
    TMPDIR cannot be shared across kernels here.
  - [Inferred] A reboot is safe: every pre-reboot owner is dead. A reused pid keeps a directory, which is the
    conservative direction.
- **Failure scenario:** host A and host B mount the same NFS TMPDIR with the same uid. Both name directories
  `…-n4026531836-`. B's sweep finds A's live `…-p812345-n4026531836-…`. Pid 812345 is absent on B, so B removes it.
- **Proposed fix:** either add a kernel discriminator to the owner tag, or have the coordinator accept this as a
  stated residual. A discriminator could be, for example, the first 8 hex characters of
  `/proc/sys/kernel/random/boot_id`, which no namespace changes (here `406a7023`). The residual would read: "a TMPDIR
  shared between kernels is out of scope".

### N8 — note — namespace equality is tested against one neighbouring value only, and a prefix comparison survives

- **Evidence:**
  - [Observed] The foreign-namespace test uses `OTHER_NS = String(Number(NS) + 1)` (`fixture-directories.test.ts:20`).
  - [Observed] My mutant `namespace-prefix-match` (`owner[2] !== namespace` → `!namespace.startsWith(owner[2])`)
    **SURVIVED**: exit 0, 19 tests run, 0 failing (`my-mutants.json`). Under it, a name whose namespace is a proper
    prefix of the sweeper's would be judged as the sweeper's own.
- **Failure scenario:** a later edit loosens the comparison, for example to tolerate a format change. It then removes
  a directory of namespace `4026` or `40265318` that answers ESRCH here, and no test fails.
- **Proposed fix:** add two foreign values to that test, `NS.slice(0, -1)` (a proper prefix) and `` `${NS}0` `` (an
  extension). Re-run `namespace-prefix-match` and record it killed.

### N9 — note — three evidence records carry an abbreviated commit, and `interrupt_probe.py` records its commit unchecked

- **Evidence:**
  - [Observed] `check_records.py` over the 18 JSON records shows `treeCommit` `0d4d5098` in `interrupt-kill-base` and
    `leak-by-file-base`, and `d8532f1a` in `tmpdir-length-probe`. These are 8-hex abbreviations, not digests. The
    other records use 40 hex.
  - [Observed] `interrupt_probe.py:25` takes the commit from `sys.argv[2]` and writes it as `treeCommit` (line 76)
    without comparing it with the worktree's `HEAD`. `kill_then_fresh_run.py:48` does assert it ("the worktree must
    be at <tree-commit>").
  - [Observed] The head kill and term records' `sha256AtCommit` hashes only `vitest.config.ts`. Their full
    `treeCommit` covers the rest. Re-checking them works, so this is a convenience gap, not a rule-11 failure.
  - [Observed] Every head record that names a commit names `3f08143c…` in full. That commit is code-identical to the
    subject (section 1). The base records resolve through `diagnosis-2026-10-22.json`, which gives the base in full
    as `0d4d50984f6aa501217fe7109b6aec1b9679e4c9`.
- **Failure scenario:** a later reader re-checks `interrupt-term-head` and trusts a commit the tool never verified. A
  later abbreviation clash would make the base records ambiguous.
- **Proposed fix:** have `interrupt_probe.py` resolve `git rev-parse HEAD` itself, or assert it as
  `kill_then_fresh_run.py` does, and write 40-hex commits. Widen `sha256AtCommit` in the kill and term records to
  the four code files. A dated note can be added beside the three abbreviated records. They need not be rewritten.

### N10 — note — the evidence scripts delete their TMPDIR argument recursively, with no guard

- **Evidence:** [Observed] `shutil.rmtree(<argument>, ignore_errors=True)` at:
  - `kill_then_fresh_run.py:50`;
  - `cli_sweep_probe.py:42` and `:87`;
  - `interrupt_probe.py:28`;
  - `mutate_sweep.py:101` and `:139`.

  Each takes the directory from the command line ("<private-tmpdir>"), and none checks it.
- **Failure scenario:** someone re-running a record cold passes `/tmp` or `$TMPDIR`. The script then removes every
  entry in the shared `/tmp` that the user can delete, including other sessions' live scratch, before the run
  starts. The suite never runs these scripts; this is tooling only.
- **Proposed fix:** at each entry point, refuse a directory that is `tempfile.gettempdir()`, `/`, `$HOME` or a
  pre-existing non-empty directory. Alternatively, take a parent and create the private directory with
  `tempfile.mkdtemp` under it.

### N11 — note, not a defect of this diff — a killed run also leaves other helpers' scratch directories, which this sweep rightly never touches

- **Evidence:** [Observed] After run 13, `/tmp/r509b-6` held 0 fixture directories. It also held three entries whose
  mtime is 17:00 local, before the fresh run began at 17:01:12: `syzygy-public-screen-70WdmU`,
  `syzygy-public-screen-wpm6S1` and `syzygy-trigger-repo-bYwJPd`. It held five later `syzygy-` entries of other
  prefixes (`syzygy-build-output-cmB4K8`, `syzygy-dossier-src-cGdpnI`, `syzygy-poc-surface-state-Cnwxn2`,
  `syzygy-public-screen-Kc84SE`, `syzygy-trigger-oIrTJN`) and `.com.google.Chrome.cxhnbB`. [Inferred from mtimes] the
  first three come from the SIGKILLed run.
  - The clean app-project run (3) left `syzygy-poc-browser-ajELi2` and two `.com.google.Chrome.*` directories beside
    its failing browser suite.
- **Failure scenario:** the bead's motivating `/tmp` exhaustion recurs through other prefixes after killed runs. This
  sweep is correctly limited to its own prefix.
- **Proposed fix:** none in this pull request. The coordinator may file a follow-up that censuses the other `syzygy-*`
  scratch prefixes under killed runs, the way `diagnosis-2026-10-22.json` did for this one.

## 6. Every changed output

**None.**
- [Observed] Outside the evidence directory, the diff is the 7 files of section 1. In
  `polaris-accessibility-main.ts` it adds one import, two comment lines and one call.
  - The call cannot throw [Inferred from the code: the listing, the kill probe, `lstat` and `rmSync` are each
    inside a `try`, and the rest is string work]. So it cannot change the CLI's exit code.
  - Run 14 shows exit 2 and the unchanged stderr line, with no evidence file written.
- [Observed] Only the temp-directory names change, by `p<pid>-n<ns>-` before the random suffix. Those names already
  varied per run through that suffix.
- [Observed] No served route, rendered page, wire format, refusal string, digest-bound artifact, `.syzygy/**` or
  `openspec/**` file changes. The daemon does not import the new module (section 2).

## 7. Verdict per acceptance criterion

| AC | Verdict | Basis |
|---|---|---|
| 1 Diagnosis recorded | **Met** | [Observed] `diagnosis-2026-10-22.json` names base `0d4d50984f6a…`: clean run, per-file runs, caller scan, SIGKILL and SIGTERM probes (F4 repaired), `/tmp` census. The AC's "39 callers" is an earlier count; the record's own population (44 files and 42 callers at base, 46 and 43 at the code commit) is disclosed in the PR body |
| 2 PID naming; once-per-run sweep of dead PIDs only, never a live PID, never a legacy name | **Not met** | [Observed] Naming: tests and runs 13 and 14. ESRCH only, EPERM and out-of-range pids kept, legacy kept: tests and run 14. Once per run: run 13. Not met: "never a live PID" fails for PID namespaces without a readable `/proc` (F5, reproduced) |
| 3 SIGKILL then one fresh run leaves 0; mutant with the sweep disabled leaves them | **Met** | [Observed] Run 13: 6 dead-pid directories, then 0 after one fresh run. The lane's `kill-then-fresh-run-sweep-disabled` record keeps the same 5 directories (2 owner pids) under `global-setup-not-registered`, with its `old`/`new` stored, and that mutant is killed at unit level in my re-run (8) |
| 4 Live-PID and legacy names survive, in tests | **Met** | [Observed] `keeps the directories of a live process, the current one included` and `keeps a name that carries no pid and namespace segment, whatever its suffix` (13 shapes); `live-pid-removed` and `name-without-pid-is-dead` killed (run 8) |
| 5 Suite green; Tests +a ~b -c; class none | **Met** | [Observed] Hosted CI at `564ec47c` is green: 5124 passed, 0 failed. Locally the app project failed only on time limits under load 66–78, which pass when lifted (runs 3–5). `Tests: +16 ~0 -0`: the new file has 14 tests; `test-model-fixture.test.ts` goes from 3 (`git show 9a30237e:…`) to 5, and the diff appends a `describe` and changes only imports above it; no other test file changes. Class none (section 2) |

## 8. Test quality

- **Plausible bugs caught** [Observed]: 22 of 22 lane mutants, and 6 of my 7, each killed by a named assertion, not
  by a timeout. Together they cover the namespace, liveness, EPERM, anchoring, hyphen, template form, `lstat`,
  `isDirectory`, uid (both polarities and the no-uid branch), the listing and removal failures, the default
  directory, the global-setup registration and the per-file absence.
- **Survivor:** `namespace-prefix-match` (N8).
- **Gap:** the `0` fallback (F5).
- **Bar 1 and bar 5:** the assertions are directory listings, not call sequences.
  - ESRCH comes from a real reaped child; "alive" is the test process itself.
  - Only `EPERM`, `getuid` and `os.tmpdir` are simulated. These are boundaries the code does not own, and the
    `process.kill` spy forwards every other pid.
  - The uid test's spy is a reasonable stand-in, and probe 11 confirms it against a real foreign owner.
- **Bar 4:** the tests derive the namespace independently (`ownNamespace()` re-reads `/proc` and does not import the
  module's function). The pid `4_194_305` in `test-model-fixture.test.ts` is above `pid_max` 4194304 [Observed], and
  the test asserts ESRCH before relying on it.
- **Bar 6, determinism and cleanup:**
  - The two files passed in every unmutated run I made: alone (run 2), inside the loaded app project (run 3), as the
    control of runs 8 and 9, inside a no-`/proc` sandbox (run 15), and on hosted CI.
  - Across my 29 mutant runs (22 + 7), the 49 failing-test entries all carry an assertion as their first error
    line. None is a time limit or `STACK_TRACE_ERROR` (a script over both JSON files).
  - `deadPid()`'s child is `node -e ''`, which exits by itself; a spawn failure rejects `once` instead of hanging.
  - Each `chmod` is restored in a `finally`. `process.getuid` is restored in a `finally`. The `node:os` mock is undone
    with `doUnmock` and `resetModules`. Private directories are removed in `afterEach`.
  - The 30 s timeouts suit the observed load: the config-import test took 2.8 s here.
  - A pid-reuse race inside `deadPid()` would need the 4,194,304-pid cycle to wrap in about a second.
- **Bar 3:** edge paths are tested in proportion to the risk: unlistable and absent directories, a removal failure
  that does not stop the sweep, a file, a symlink, another uid, no uid, an out-of-range pid and 13 name shapes. The
  remaining gaps are F5 and N8.
- **Bar 10, growth:** +16 tests in the helper's own two test files. Each pins a distinct predicate, as the 22 kills
  show, and none duplicates another.

## 9. Cleanup

- I deleted my scratch clones (`…/scratchpad/rev-509b/clone`, `…/scratchpad/rev-509b/mut`) and my TMPDIRs
  `/tmp/r509b-1` to `/tmp/r509b-14`. Number 4 was never created. Number 5 was removed by `my_mutants.py` itself.
  Number 12 was left empty by `mutate_sweep.py`. Number 8 held only a preload smoke test. Afterwards, `ls -d
  /tmp/r509b-*` matches nothing.
- Run 15 did not exit. I sent SIGKILL by pid, after re-reading each one's `TMPDIR=/tmp/r509b-14` marker, to 9 of its 10
  listed processes; the tenth had already exited. A final `/proc` scan (`find_mine.py`) finds 0 processes naming
  any `/tmp/r509b-*` TMPDIR. The kill probe left no orphans.
- I deleted nothing in `/tmp` outside my own TMPDIRs. I made no read or probe of the shared `/tmp` beyond
  `findmnt -T /tmp`.
- I made no `bd` mutation, push, PR comment or merge, and no edit under `/home/tze/GitHub/syzygy/.worktrees/`. I read
  no observed repository and opened no credential file. The read-only `grep -a` of the Claude Code binary was under
  `~/.local/share/claude/versions/`.
- Tools and results are kept in
  `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-509b/tools/`:
  - scripts: `ns_probe.py`, `holder.mjs`, `sweeper.mjs`, `foreign_owner_probe.py`, `log_rm.mjs`, `race_probe.mjs`,
    `kill_probe.py`, `count_readdir.mjs`, `cli_probe.py`, `my_mutants.py`, `check_records.py`, `find_mine.py`,
    and `check_raw_digests.py`, which checks every digest and commit this raw cites against the files;
  - the module copy: `fixture-directories.built.mjs` (sha256 `3a3067a6…fa8db231`);
  - results: `ns-probe.json`, `foreign-owner-probe.json`, `race-probe.json`, `kill-probe.json`, `cli-probe.json`,
    `my-mutants.json`, `lane-mutants-rerun.json` (sha256 `a4e4e0c3…92872782`), and the run logs.
