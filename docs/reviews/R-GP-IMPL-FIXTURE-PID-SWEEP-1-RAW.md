# R-GP-IMPL-FIXTURE-PID-SWEEP-1 — CC-REV-1 implementation review of syzygy-bpyt.4.10, round 1
Verdict: REVISE
Reviewed commit: c64d2834
Subject: r1-review.diff sha256 095dd13e22e3ed61ca2733f80f8bbdf86cef2aeadf875278346acfed741042f2

Reviewer: rev-509, fresh context; I did not author the change. Date 2026-10-22. Full reviewed commit
`c64d28340d0058fade53ab5cb326fb5859751612`, base `c55acb73753dc8d29d53b34b38b5d2af0cee6080`, PR #509, bead
`syzygy-bpyt.4.10`. Every run below used a short private TMPDIR under `/tmp/r509-<n>`; no run or probe of the sweep was
given the shared `/tmp`.

## 1. Subject identity checks

- [Observed] `sha256sum r1-review.diff` gives `095dd13e22e3ed61ca2733f80f8bbdf86cef2aeadf875278346acfed741042f2`, the
  digest in the brief.
- [Observed] In a fresh clone, `git diff c55acb73… c64d2834… --output=rederived.diff` hashes to the same digest: the
  subject file is byte-identical to the diff. **The digest matches.**
- [Observed] `git merge-base c64d2834 68c553b8` (current GitHub main) is `c55acb73753dc8d29d53b34b38b5d2af0cee6080`.
- [Observed] `git diff --name-only` lists 23 files: `apps/three-surface-poc/src/test-model-fixture.ts`,
  `apps/three-surface-poc/src/test-model-fixture.test.ts`, and 21 files under
  `docs/evidence/poc-fixture-leak-2026-10-22/`.
- [Observed] `git ls-remote origin` (GitHub): `refs/heads/agent/syzygy-bpyt.4.10` is
  `c64d28340d0058fade53ab5cb326fb5859751612`; `refs/heads/main` is `68c553b8ca643fcec1558768b6cad4c0af911f28`.
  `gh pr view 509`: `headRefOid` `c64d2834…`, state OPEN.
- [Observed] **The local branch has moved past the subject.** In `/home/tze/GitHub/syzygy` the branch
  `agent/syzygy-bpyt.4.10` is at `d59d76c36987f1f36580d741962266aa6f4537b6` (2026-10-22T08:59:37+08:00, "fix: sweep
  dead-owner POC fixture directories once per run, from a global setup [syzygy-bpyt.4.10]"). It is one commit after
  `c64d2834`, touches 6 files (new `fixture-directories.ts`, `fixture-directories.test.ts`,
  `test-fixture-sweep.global-setup.ts`, `vitest.config.ts` and both subject files), and was not on GitHub when I
  checked. It is outside this subject and I did not review it (rule 10). This verdict covers `c64d2834` only.
- [Observed] The code the evidence records ran at is the reviewed code: `git diff --stat baf06475 c64d2834 -- apps
  packages scripts vitest.config.ts package.json` is empty. At `c64d2834`, `test-model-fixture.ts` hashes to
  `8cc4f6bea2b7f8486b0609c7e7b58d73e9a7dba335b01f17d698de583ed64e87` and `test-model-fixture.test.ts` to
  `ca3c4b4506120eee6f53dfde10684dbdfea8effba52eb036457c6bdd2399f5b0`. These equal `sha256AtCommit` in
  `clean-run-head`, `kill-then-fresh-run-head`, `kill-then-fresh-run-sweep-disabled` and `mutants-sweep`, whose
  `treeCommit` is `baf064755ebb4e5a9b5da7dbf259aa7c27ab6d5b`.

## 2. Clauses relied on (quoted)

- **CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:18-20`): "Changes touching any of
  seven classes require review by an independent, fresh-context reviewer, and the agent performing the change never
  finally decides which classes it touches." Lines 37 and 40-41: "4. **security** — anything under SEC-1…SEC-5, auth
  surfaces, egress paths;" and "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an
  external consumer can depend on;". Line 51: "**A reviewer or the owner** may reclassify at any time."
- **SEC-4** (`.syzygy/governance/doctrine/security.md:112-114`): "**SEC-4 — Writes are consented, attributed, and
  revertable.** Syzygy writes into a governed repository only with recorded consent, and every write can be traced and
  undone."
- **GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:52-55`, four
  list lines joined): "\"Behavior-preserving\" means none of the following changes: / a rendered byte, a wire format,
  a refusal string or an exit code; / a signed or digest-bound artifact; / a consent, security or retention
  decision." Line 62: "**Which ones:**
  pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security),
  and class-6 pull requests that remove an endpoint."
- **AGENTS.md** at the reviewed commit, rule 6: "Mutate the input and confirm the check fails, per predicate, before
  trusting it". Rule 9: "A claim of absence needs a sweep with a denominator." Rule 10: "Freeze the bytes a review is
  bound to; any later edit retires the review." Rule 11: "An evidence record names its subject and the subject's
  digest; a record that names neither cannot be re-checked against the bytes it describes." Guardrail: "A rule-6
  evidence record must store each mutant's `old`/`new` fragment and the commit it ran at". Guardrail: "Fail-closed
  polarity: withdrawal defeats grant; future-dated evidence is stale; no evidence → Unknown."
- **The bead's acceptance criteria** (`bd show syzygy-bpyt.4.10`): "1. Diagnosis recorded with its commit: a clean
  three-surface-poc-app run with a fresh TMPDIR leaves 0; the 42 helper-using files alone leave 0; 0 of 39 callers fail
  to drain; killed runs (SIGKILL, SIGTERM) leak; the /tmp population's mtime bursts. 2. Fixture copies and templates
  carry the owner PID; a once-per-run sweep removes only PID-named fixture directories whose PID is dead (ESRCH), never
  a live PID, never a legacy name. 3. SIGKILL a run, then one fresh run: 0 dead-PID fixture directories remain; rule-6
  mutant with the sweep disabled leaves them (recorded). 4. Tests show a live-PID directory and a legacy-name directory
  survive the sweep. 5. Suite green; Tests: +a ~b -c; class none." Bead comment (coordinator, 2026-10-21 22:37): "the
  fix is PID-named fixture directories plus a once-per-run sweep of dead-PID directories."
- **The coordinator's conditions** as the brief states them (`brief-r1.md:26-30`, five list items joined): "the sweep
  touches only its own TMPDIR; / it uses `lstat` and never follows a symlink; / it runs once per run; / EPERM counts
  as alive; / a live PID and a legacy (no-PID) name are never removed." [Observed] These conditions are in the brief, not in the bead record.
- **The bead description's cleanup rule:** "Do not delete other sessions' live directories: a one-off cleanup may remove
  only directories older than 6 hours."
- **Test-rigor bar** (`th-engineering/subskills/test-rigor/SKILL.md`), item 3: "Edge and failure paths are first-class —
  Empty inputs, boundaries, invalid states, error branches, and concurrency-sensitive paths get tests proportional to
  blast radius." Item 6: "Deterministic or quarantined". Core rule: "A test is worth keeping only if some plausible bug
  makes it fail."

**Class ruling (mine): none.** The change is test support. Class 4 covers "anything under SEC-1…SEC-5, auth surfaces,
egress paths". SEC-4 governs Syzygy's writes into a governed repository; this helper deletes host scratch directories
from test code. It is not a product write, an auth surface or an egress path. Class 6: no endpoint, adapter contract or
consumer-facing output changes (section 5). Classes 1, 2, 3, 5 and 7 are not touched. **GP-Q0's three extra checks do
not apply**: they cover classes 1, 3 and 4 and class-6 changes that remove an endpoint, and none is touched. The
deletion-safety questions below are host-safety questions. GP-Q0's behaviour-preserving list does not cover them, so I
judge them under the brief's verdict rule: "A path by which the sweep could delete a directory it did not create is
blocking."

## 3. What I ran and the results

All runs were in my scratch clone at `c64d2834`, after `npm ci` ("added 115 packages in 2s") on Node v24.6.0 with Vitest
3.2.7. The host was loaded by other lanes.

| # | Command (cwd = clone) | Result [Observed, verbatim where quoted] |
|---|---|---|
| 1 | `npm run typecheck` | `tsc -b …` printed nothing; exit 0 |
| 2 | `TMPDIR=/tmp/r509-1 npx vitest run apps/three-surface-poc/src/test-model-fixture.test.ts --project @syzygy/three-surface-poc-app` | " Test Files  1 passed (1)" / "      Tests  10 passed (10)"; TMPDIR left only `node-compile-cache` |
| 3 | `TMPDIR=/tmp/r509-2 npx vitest run --project @syzygy/three-surface-poc-app` | " Test Files  88 passed \| 1 skipped (89)" / "      Tests  1100 passed \| 2 skipped (1102)" / "Duration  199.83s"; exit 0. TMPDIR left `.com.google.Chrome.IFFGBo` and `node-compile-cache`: **0 fixture directories** |
| 4 | `python3 scripts/check_governance.py` | "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted"; exit 0 |
| 5 | Lane's `mutate_sweep.py` re-run (TMPDIR=/tmp/r509-8) | "control True 10 0", then each of the 10 mutants "killed", then "survivors: []" |
| 6 | Reviewer's `my_mutants.py` (4 further mutants, TMPDIR=/tmp/r509-10) | control "Tests  10 passed (10)"; 4 of 4 killed (section 7) |
| 7 | Reviewer's kill-then-fresh-run probe `my_kill_probe.py` (TMPDIR=/tmp/r509-7) | Reproduces AC3 (detail below) |
| 8 | Deletion-safety probes `safety_probe.mjs` against the built helper (`dist/test-model-fixture.js`, built from the reviewed source by the typecheck), directory `/tmp/r509-3` | F3 and N1 |
| 9 | Cross-PID-namespace probe `ns_probe.mjs` + `inner_sweep.mjs` under `bwrap --unshare-user --unshare-pid`, directory `/tmp/r509-4` | F1 |
| 10 | Concurrent-sweep probe `race_probe.mjs`, directory `/tmp/r509-5` | F2 (safety half) |
| 11 | Instrumented sweep count `count_sweeps.py` (logging line added, then restored and sha256-checked), TMPDIR=/tmp/r509-6 | "Test Files  88 passed \| 1 skipped (89)"; 42 sweeps of the run TMPDIR from 42 processes; 0 fixture entries left (F2) |
| 12 | SIGTERM probe `term_probe.py`, TMPDIR=/tmp/r509-11 | 5 dead-pid directories left 5 s and 30 s after the run exited (F4) |
| 13 | Read-only host checks: `/proc/self/status`, a `/proc` namespace scan, a `/tmp` name census, the installed Claude Code binary | F1, N5 |

**Run 7 detail** [Observed]. The app project was started in a new session. When 3 copies existed (18.4 s in), the probe
sent SIGKILL to that session's process group (pgid 3552124, the child it started). Five seconds later the TMPDIR held 5
dead-PID directories: `…-p3552564-cOBTye`, `…-p3552576-GUFWjz`, `…-p3552576-snC21v`, `…-template-p3552564-u1ECnU` and
`…-template-p3552576-IAb9lz` (3 copies, 2 templates, 2 owner pids). A fresh run of `trajectory.test.ts` with the sweep
call removed (`old` `"  removeFixturesOfDeadProcesses();\n  const root = mkdtempSync("`, `new` `"  const root =
mkdtempSync("`) printed "Tests  15 passed (15)" and left all 5. The helper was restored and sha256-checked. An
unmutated fresh run of the same file printed "Tests  15 passed (15)" and left **0** dead-PID directories, 0 live and 0
legacy. Record: `kill-probe.json` in my scratch directory, `treeCommit` `c64d2834…`, `helperSha256` `8cc4f6be…ed64e87`.

## 4. Findings

### F1 — blocking — the liveness test cannot see other PID namespaces: a sweep there removes a live run's directories

- **Severity:** blocking under the brief's rule: the sweep removes directories it did not create, and AC2 says "never a
  live PID". The blast radius is bounded. Only entries named like fixture directories are affected, so a concurrent
  run loses its fixture repositories mid-test and fails spuriously. Nothing else is deleted.
- **Evidence:**
  - [Observed] `ns_probe.mjs`. A host-namespace node process (pid 3528636) made
    `syzygy-poc-surface-fixture-p3528636-LIVE01/repo/README.md` in `/tmp/r509-4`. The helper's sweep, run from the
    same namespace, kept it: `"keptBySameNamespaceSweep": true`. The probe then ran the same built helper under
    `bwrap --unshare-user --unshare-pid --dev-bind / / --proc /proc -- node inner_sweep.mjs /tmp/r509-4 …`, which
    printed `{"innerPid":2,"outerPidSeenAs":"ESRCH"}`. Afterwards: `"ownerStillAliveAfterInnerSweep": true`,
    `"liveDirectoryAfterInnerSweep": "REMOVED"`.
  - [Observed] The installed Claude Code CLI (`/home/tze/.local/share/claude/versions/2.1.306`) puts `--unshare-pid` in
    its Linux sandbox's bwrap arguments: `pt.push("--dev","/dev"),pt.push("--unshare-pid")` in one path and
    `["--new-session","--die-with-parent","--unshare-user","--unshare-pid",…` in another. A sandboxed command
    therefore runs in its own PID namespace.
  - [Observed] This session is not in a nested namespace: `/proc/self/status` shows one value, `NSpid:	3436774`.
  - [Observed] 35 uid-1000 processes on this host are in nested PID namespaces (k3s containers). 15 have their own
    `/tmp`, 20 could not be read (errno 13), and 0 were seen sharing the host `/tmp`.
  - [Unknown] Whether any of the owner's sessions run sandboxed with a TMPDIR shared between sandboxed commands. One
    code path in the CLI names a `privateTmp` mounted with `--bind-fd`, which suggests some modes get a private
    `/tmp`.
- **Failure scenario:** two sandboxed lanes run the app project with the same TMPDIR, and each vitest invocation is in
  its own PID namespace. Pids there are small (inner pid 2 above). Lane B's worker sweeps and finds lane A's
  `…-p37-…`. Pid 37 does not exist in B's namespace, so kill returns ESRCH, and A's live template and copies are removed
  while A's file is still running. A then fails in `cpSync` or git with ENOENT. A container that bind-mounts `/tmp`
  breaks the same way against host runs. The converse makes the bead's leak come back: a dead sandboxed run's names
  carry small pids, which are usually alive on the host (init, kernel threads, EPERM), so host runs keep them forever.
- **Proposed fix:** put the PID namespace in the owner tag, and sweep only names from the sweeper's own namespace.
  1. Read `readlinkSync('/proc/self/ns/pid')` once. It gives `pid:[4026531836]`; take the inode, or `0` where `/proc`
     is absent (macOS).
  2. Name copies `syzygy-poc-surface-fixture-p<pid>-n<ns>-XXXXXX`, and templates the same with `template-`.
  3. Match `^syzygy-poc-surface-fixture-(?:template-)?p(\d+)-n(\d+)-`, and keep any name whose namespace differs from
     the sweeper's, as if alive.
  4. Do not use the hostname: the CLI sandbox passes `--hostname localhost` to every sandbox.
  5. Reclaiming foreign-namespace leftovers would need an age floor (the bead's own cleanup rule is 6 hours). That is a
     separate rule, for the coordinator to approve.
  6. Tests: a dead-pid name with a foreign namespace survives. A rule-6 mutant that ignores the namespace segment must
     fail that test.

### F2 — blocking (an AC deviation, not a safety defect) — the sweep runs once per test file, not once per run

- **Severity:** blocking. AC2 and the coordinator's condition say "once-per-run". The bytes need to change, or the
  coordinator needs to amend AC2. My judgement on the brief's question: the per-file placement **does not meet** AC2 as
  written, and it **is safe**. Apart from F1 and F3, it adds no deletion path.
- **Evidence:**
  - [Observed] `committedFixtureRepo()` calls `removeFixturesOfDeadProcesses()` (`test-model-fixture.ts:102`).
    `template ??= committedFixtureRepo()` (line 44) runs once per module instance, and Vitest isolates each test file
    in its own module instance. 42 tracked files name the helper at `c64d2834`: 41 `*.test.ts` and
    `polaris-accessibility-variants.ts`.
  - [Observed] Instrumented app-project run (`count_sweeps.py`; one logging line, removed and sha256-checked
    afterwards). It printed "exit 0", "Test Files  88 passed | 1 skipped (89)", "Tests  1100 passed | 2 skipped
    (1102)", "sweep calls by directory: {'run TMPDIR': 42, 'other (unit-test private dirs)': 7}", "distinct processes
    sweeping the run TMPDIR: 42" and "fixture entries left: []". **One app-project run swept its TMPDIR 42 times, from
    42 processes**, not once. The other 7 calls are the unit tests' sweeps of their own private directories.
  - [Observed] Safety under concurrency (`race_probe.mjs`): 3 rounds of 4 concurrent sweep processes, each round over
    150 dead-pid directories nested 3 levels deep. 12 of 12 processes exited 0 with no stderr, 0 of 450 dead
    directories were left, and the 3 live-pid directories were kept.
  - [Inferred from the code] Every call evaluates the same name-and-liveness predicate. Within one namespace, a sibling
    worker of the same run is alive, so it is kept.
  - [Observed] Cost: one `readdir` of TMPDIR for each of the 42 sweeping processes. `/tmp` holds 4,505 entries now.
  - The placement has one side effect, which the PR body lists as a residual ("Same-run leaks vanish"). In a full run,
    a later file's sweep removes an earlier worker's leftovers once that worker has exited. A caller that never drains
    then stops showing up in a whole-run leak count.
- **On the lane's reasons:** keeping naming and sweep in one module is a real benefit, and so is covering the
  accessibility CLI, where a Vitest `globalSetup` never runs. But AC2, the bead comment and the brief all say once per
  run.
- **Proposed fix, one of:**
  - (a) The coordinator amends AC2 to the per-file placement, for example "at the first template of each test file and
    of each CLI process". The amendment records the cost and the same-run masking.
  - (b) Move the sweep to a once-per-run hook (a Vitest `globalSetup`) and have the CLI call it once at start. The
    lane's unpushed `d59d76c3` appears to take (b). It is outside this subject and needs its own review.

### F3 — blocking — no `lstat` type or owner check: the sweep removes any entry with a matching name, and descends into directories it did not create

- **Severity:** blocking under the brief's rule. It also misses the coordinator's condition ("it uses `lstat`") and
  AC2's "removes only PID-named fixture directories".
- **Evidence:**
  - [Observed] `test-model-fixture.ts:67-77` has no `lstat`/`stat` call. After the name match and `kill(pid, 0)` it goes
    straight to `rmSync(join(directory, name), { recursive: true, force: true })`. Over the whole 301-line file, ugrep
    `stat|getuid|isDirectory` matches only 4 `status` lines. A Python count gives 0 each for `lstat`, `statSync`,
    `.uid`, `getuid`, `isDirectory` and `isSymbolicLink`.
  - Probes against the built helper on Node v24.6.0 (`safety_probe.mjs`, directory `/tmp/r509-3`) [Observed]:
    - P2. A regular file `syzygy-poc-surface-fixture-p<dead>-FILE01`: `"entry": "absent"`. It was removed.
    - P1. A symlink at a dead-pid name, pointing at a directory with two canaries: the link is `"absent"`, and
      `"targetCanary": true`, `"targetNestedCanary": true`. The link was unlinked, not followed.
    - P3. A dead-pid directory holding a symlink to an outside directory: the fixture is `"absent"`, and
      `"targetCanary": true`. The symlink was not followed.
  - So on this Node version "never follows a symlink" holds, through `rmSync`'s own behaviour [Observed]. "Uses lstat"
    does not hold [Observed], and non-directories are removed [Observed].
  - [Inferred; not run, as no second uid is available] Suppose another user makes a directory at a matching dead-pid
    name, with mode 0777, in the sticky `/tmp`. The sweep's recursive removal deletes its contents, because unlinking
    inside a non-sticky directory needs only write and search permission on that directory. It fails only on the
    top-level entry, because of the sticky bit, and the `catch` swallows that failure.
  - Recursive removal inside a tree another user controls is also the precondition of the symlink-swap race class
    (CVE-2022-21658, Rust's `remove_dir_all`). [Unknown] Whether Node 24.6.0's `rmSync` resists that race.
  - With an owner check, the sweep only enters directories this uid made with `mkdtemp` (mode 0700), which no other
    user can write into.
  - [Observed] The lane's own manual tidy used both guards: "only directories directly under /tmp named
    syzygy-poc-surface-fixture-*, owned by this user, of type directory, with `find -mmin +360`"
    (`verification-2026-10-22.json`, `oneOffCleanup.rule`). The code uses neither.
- **Failure scenario:** another account on the host creates `/tmp/syzygy-poc-surface-fixture-p4194000-x/` with mode
  0777 and fills it. The next run by tze deletes those files. The same uid can lose a stray regular file or symlink
  that happens to carry a matching name.
- **Proposed fix:**
  - In the loop, `let st; try { st = lstatSync(path); } catch { continue; }`.
  - Skip the entry unless `st.isDirectory()` (false for a symlink under `lstat`) and
    `(process.getuid === undefined || st.uid === process.getuid())`. Only then call `rmSync`.
  - Tests: a regular file and a symlink at dead-pid names both survive. A mutant that drops the `isDirectory` guard,
    and one that drops the uid guard, must each fail a test. The uid guard can be driven by spying on `process.getuid`.

### F4 — blocking, low severity (evidence only) — AC1's SIGTERM half is not recorded

- **Evidence:**
  - [Observed] 0 of the 21 files in `docs/evidence/poc-fixture-leak-2026-10-22/` record a TERM signal, by two methods:
    - ugrep `-rl -E "TERM"` over the directory returns no file.
    - A Python sweep with `sigterm|\bTERM\b|signal\.SIGTERM|15\)`, case-insensitive, over the same 21 files. Its only
      hits are "Tests  15 passed (15)" in the two `leak-by-file` records, which the `15\)` alternative matches.
  - [Observed] `git grep -l -E "TERM" 0d963aaf… -- docs/evidence/poc-fixture-leak-2026-10-22/` also returns nothing.
  - [Observed] The interrupt record has `"signal": "KILL"` only.
  - [Observed] My own SIGTERM probe at `c64d2834` (`term_probe.py`, TMPDIR=/tmp/r509-11). SIGTERM went to the process
    group of the run it started, 41.6 s in, with 5 live fixture directories. The run exited 1 within 60 s, so there
    was no escalation to SIGKILL. Then `"fiveSecondsAfterExit": {"dead": 5, "live": 0, "legacy": 0}` and
    `"thirtySecondsAfterExit": {"dead": 5, "live": 0, "legacy": 0}`. So the AC1 claim holds (SIGTERM leaks too, and the
    sweep covers it at the next run), but the lane's records do not show it. The same 8 orphan processes as in N4
    remained; I stopped them by pid.
- **Failure scenario:** none at runtime. The diagnosis AC claims something its records do not show.
- **Proposed fix:** keep a SIGTERM interrupt record (`interrupt_probe.py` with the signal as a parameter), or the
  coordinator strikes SIGTERM from AC1.

### N1 — note — `readdirSync` is outside the `try`, so a TMPDIR that cannot be listed fails the run

- **Evidence:** [Observed] probe P5: a 0333 directory passed to the sweep gives "threw EACCES". The doc comment says "a
  sweep must not fail the run that starts it". [Inferred] `mkdtempSync` needs only write and search permission, so the
  base helper works in such a directory and the head helper fails there.
- **Failure scenario:** rare. A TMPDIR with write and search but no read permission.
- **Proposed fix:** `let names; try { names = readdirSync(directory); } catch { return; }`. Test it with `chmod 0o333`.

### N2 — note — the PR body overstates a test

- **Evidence:** the residual "A directory another user owns cannot be removed and is left (tested; the sweep must not
  fail the run that starts it)". [Observed] The test `does not fail the run when a dead process's directory cannot be
  removed` makes a same-uid directory 0555. No test covers another user's directory, and a 0777 one would be emptied
  (F3).
- **Proposed fix:** correct the PR body's wording when F3 lands.

### N3 — note — hygiene of the lane's mutant runner

- **Evidence:** [Observed] The docstring of `docs/evidence/poc-fixture-leak-2026-10-22/mutate_sweep.py` says "Usage:
  mutate_teardown.py". Its `tempfile.mkdtemp(prefix='zz-mutate-sweep-')` report directory is never removed: my re-run
  with TMPDIR=/tmp/r509-8 left `zz-mutate-sweep-gud66pbo`. Run without a private TMPDIR, it leaves one directory in
  `/tmp` per run.
- **Proposed fix:** remove `report.parent` in the final `finally`, and correct the usage line.

### N4 — note — killed runs leave orphan processes that no directory sweep can address

- **Evidence:** [Observed] After my group SIGKILL (run 7), 8 processes still had `TMPDIR=/tmp/r509-7`: 4 `cat` and 4
  `/opt/google/chrome/chrome_crashpad_handler`. The lane's record has the same count, 8 pids in
  `processesStillNamingThisTmpdir` (`kill-then-fresh-run-head`). My SIGTERM probe (F4) left 8 more of the same two
  kinds, under `TMPDIR=/tmp/r509-11`. I stopped all 16 of mine by pid.
- **Proposed fix:** out of scope for this bead. A follow-up bead should find which test spawns them outside the run's
  process group. They are probably Chrome's crashpad handlers, which run in their own session.

### N5 — note — the manual tidy ran twice under a "one-off" allowance

- **Evidence:** the bead description says "a one-off cleanup may remove only directories older than 6 hours". The PR
  body records two passes, 58 and then 106 removed, under one rule (`find /tmp -maxdepth 1 -type d -user tze -name
  'syzygy-poc-surface-fixture-*' -mmin +360`).
  - [Observed] My read-only census now finds 4,505 entries directly under `/tmp`. 87 are legacy fixture directories:
    all uid 1000, all of type directory, aged 3.3 to 5.5 hours. 0 are PID-named. This matches the PR body's "87
    directories".
  - [Unknown] The removed directories' ages at removal: only the saved `find` lists survive.
- **Proposed fix:** none in code. The coordinator should ratify or reject the second pass.

### N6 — note — test gaps

- **Evidence:** no test pins the namespace guard (F1), the type and owner guard (F3), or an unlistable TMPDIR (N1).
  Test-rigor bar item 3 asks for exactly these edge paths.
- **Proposed fix:** add them with the F1, F3 and N1 fixes, each with a mutant.

## 5. Every changed output

**None.**
- [Observed] Outside the evidence directory, the diff touches only `test-model-fixture.ts` and its test.
- [Observed] The helper's tracked importers at `c64d2834` are 41 test files and `polaris-accessibility-variants.ts`, a
  development CLI, not a served route.
- [Observed] The fixture repository's committed revision is pinned. The existing test asserts
  `1f892687d53c829f9c2a4ee99bccccb23d6158df`, and it passed in runs 2 and 3.
- [Inferred] Only the temporary directory name changed: `p<pid>-` is added before the random suffix. That name already
  varied from run to run through its random 6-character suffix, so no deterministic output can depend on it.
- No rendered byte, wire format, refusal string, exit code or digest-bound artifact changes. No file under `.syzygy/**`
  or `openspec/**` is touched [Observed: name list in section 1].

## 6. Verdict per acceptance criterion

| AC | Verdict | Basis |
|---|---|---|
| 1 Diagnosis recorded | **Partly met** | [Observed] `diagnosis-2026-10-22.json` names base `0d4d5098…`: clean run 0, per-file 0 over 42 files, a caller scan whose own population is 44 files and 42 callers (AC1 says 39, from an earlier count), a SIGKILL probe, and the mtime-burst census. The SIGTERM half is missing (F4) |
| 2 PID naming; once-per-run sweep of dead PIDs only | **Not met** | [Observed] The naming is correct: test `names the template and each copy…`, and the names seen in run 7. Within one PID namespace the predicate is right: ESRCH removes; EPERM (pid 1), `ERR_INVALID_ARG_TYPE` (pid ≥ 2^31), a live pid, pid 0 and the legacy shapes are all kept (probe P4, unit tests). Not met: "never a live PID" fails across PID namespaces (F1); "only … directories" fails for non-directories, with no lstat (F3); "once-per-run" (F2) |
| 3 SIGKILL then one fresh run leaves 0; mutant leaves them | **Met** | [Observed] Reproduced independently (run 7), and the lane's records give the same figures (5 left, then 0; 5 stay with the mutant). The records name `treeCommit` and `sha256AtCommit`, and store the mutant's `old`/`new` |
| 4 Live-PID and legacy names survive, in tests | **Met** | [Observed] Tests `keeps the directories of a live process…` (process.pid, both forms) and `keeps a name that carries no pid segment…` (8 shapes). The mutants `live-pid-removed` and `name-without-pid-is-dead` are killed in my re-run |
| 5 Suite green; Tests +a ~b -c; class none | **Met for what I ran** | [Observed] App project green (run 3). Typecheck 0. check_governance 0 FAIL. `Tests: +7 ~0 -0`: the test file goes from 3 tests to 10, the diff's 4 deleted lines are all import lines, and no other test file changes. Class none, which I confirm in section 2. I did not run the full suite: the lane reports 229 files passed at `baf06475` and battery 110/0 at `c64d2834` [Unknown to me] |

## 7. Test quality

- **What the 7 new tests catch** [Observed]. The lane's 10 unit mutants are all killed in my re-run. My 4 further
  mutants are also all killed:
  - `fixed-directory-not-tmpdir`, where the default directory is a fixed path: killed by `sweeps the dead before it
    makes the file's template…`. This pins the condition "touches only its own TMPDIR".
  - `only-eperm-means-alive`, where `ERR_INVALID_ARG_TYPE` counts as dead: killed by `keeps a directory whose pid fails
    with anything but ESRCH`.
  - `removal-not-recursive`: killed by 3 tests.
  - `copies-unmatched`, where only template names match: killed by 2 tests.
- **Bar 1 and bar 5:** the tests assert observable directory listings, not call sequences.
  - ESRCH comes from a real reaped child.
  - "Alive" is the test process itself.
  - Only EPERM is simulated, by a spy on `process.kill`. That is a boundary the code does not own, and the spy forwards
    every other pid to the real call.
  - The naming test goes through a fresh module instance with a stubbed TMPDIR, so it exercises the real `tmpdir()`
    path.
- **Bar 6, determinism:**
  - `deadPid()` checks ESRCH right after the child is reaped. If that pid were reused before the sweep ran, the
    "removes" tests would fail, because the directory would be kept as alive. `pid_max` is 4194304 [Observed], so this
    is improbable. It is acceptable.
  - The spawned child is `node -e ''` and exits by itself, so there is nothing to clean up if a test fails. If the
    spawn itself fails, `events.once` rejects on `'error'`, so the test fails instead of hanging [Inferred from Node's
    `events.once` contract].
  - The chmod test restores 0755 in a `finally`. `afterEach` restores mocks, environment variables and modules, and
    removes the private directories.
  - The two tests that commit a git template have 30-second timeouts for load.
  - All 10 tests passed in each of the 4 unmutated runs of the file: alone (run 2), inside the loaded app-project run
    (run 3), and as the control of each of the two mutant runs. That is 40 test executions with 0 failures. The
    instrumented count run passed too, but it is not on the reviewed bytes.
- **Bar 3, gaps:** the namespace guard, the type and owner guard, and an unlistable TMPDIR are untested (N6). So is the
  same-run masking effect of the per-file placement (F2).
- **Bar 10, growth:** +7 tests, all in the one test file for the helper. Each pins a distinct predicate (rule-6
  evidence above). Nothing is duplicated.

## 8. Cleanup

- Removed, all mine: the scratch clone `…/scratchpad/rev-509/clone` and the private TMPDIRs `/tmp/r509-1` through
  `/tmp/r509-11`, including `/tmp/r509-9`, which `my_mutants.py` creates and removes itself.
- Stopped by pid: the 16 orphan processes my SIGKILL and SIGTERM probes left (N4). A final `/proc` scan finds no process that names any of
  my TMPDIRs.
- Nothing in `/tmp` outside my own TMPDIRs was deleted. The only reads of the shared `/tmp` were the read-only name
  census and the `lstat` calls inside it.
- No `bd` mutation, push, PR comment or merge. No edit under `/home/tze/GitHub/syzygy/.worktrees/`. No observed
  repository was read. No credential file was opened.
- The probe scripts and their JSON outputs stay in `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-509/`
  for re-running: `safety_probe.mjs`, `ns_probe.mjs`, `inner_sweep.mjs`, `race_probe.mjs`, `my_kill_probe.py`,
  `kill-probe.json`, `my_mutants.py`, `my-mutants.json`, `count_sweeps.py`, `term_probe.py`, `mutants-rerun.json` and
  the `/proc` scan scripts.
