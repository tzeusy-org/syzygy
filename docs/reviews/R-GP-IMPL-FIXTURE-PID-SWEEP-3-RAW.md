# R-GP-IMPL-FIXTURE-PID-SWEEP-3 — CC-REV-1 implementation review of syzygy-bpyt.4.10, round 3
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: a6be8816
Subject: r3-review.diff sha256 ce3b908688b10fa5c43449734c3f783785e378d65b5bfb05550437fd5dd3b8cb

Reviewer: rev-509c, fresh context. I did not write the change, round 1 or round 2. Work ran 2026-10-22 to
2026-10-24, with a pause for a usage limit in between; the subject was re-checked after the pause (section 1).
Full reviewed commit `a6be88169abd9287de0fe181f83d36d61983cd34`, base `9a30237ed700e6579f3fcc1c6292e6c759861c3f`,
PR #509, bead `syzygy-bpyt.4.10`. This is a fresh review of the whole diff. Every suite and probe ran with a short
private TMPDIR (`/tmp/r509c-<n>`). No run or probe of the sweep was given the shared `/tmp`. New findings continue
the numbering (N12 onwards). There are no new F findings.

## 1. Subject identity checks

- [Observed] `sha256sum r3-review.diff` gives `ce3b908688b10fa5c43449734c3f783785e378d65b5bfb05550437fd5dd3b8cb`.
  In my clone, `git diff 9a30237e… a6be8816… | sha256sum` gives the same value. **The digest matches.** Re-hashed
  after the pause: unchanged.
- [Observed] `gh api repos/Tzeusy/syzygy/compare/main...a6be8816…` gives `merge_base_commit`
  `9a30237ed700e6579f3fcc1c6292e6c759861c3f`, "diverged", ahead 21, behind 5. GitHub `main` is
  `ce322e1a65b784c6304d51b05fb347351912a926`. `gh api …/pulls/509 --jq .head.sha` is `a6be8816…`, both at the start
  and after the pause.
- [Observed] Overlap with main's move: `compare/9a30237e...ce322e1a` lists 22 files. The subject lists 45. `comm -12`
  of the two sorted lists is empty, so no file overlaps.
- [Observed] The diff has 45 files. 38 are under `docs/evidence/poc-fixture-leak-2026-10-22/`. The other 7 are the
  seven the brief names. 0 are under `.syzygy/` or `openspec/` (a `grep -c -E '^(\.syzygy|openspec)/'` over
  `git diff --name-only` prints 0).
- [Observed] **What changed in code since round 2.** `git diff --stat 564ec47c a6be8816 -- apps packages scripts
  vitest.config.ts package.json package-lock.json vitest.setup.ts .github` lists 2 files:
  - `fixture-directories.ts` (+13 −9): `pidNamespace()` returns `string | undefined`; the prefixes use `?? '0'`; the
    sweep reads the namespace first and returns before listing when it is `undefined`; the doc comment is rewritten;
  - `fixture-directories.test.ts` (+66 −16 lines).

  The other five code and config files are byte-identical to round 2.
- [Observed] **The evidence's code commit is code-identical to the subject.** `git diff --stat 88dcdf76 a6be8816` and
  `git diff --stat 001fbfc8 a6be8816`, each over `apps packages vitest.config.ts`, print nothing. So does the first
  one widened to `scripts`, `vitest.setup.ts`, `package.json`, `package-lock.json` and `.github`. Each of the six
  digests in `mutants-sweep`'s `sha256AtCommit` equals the blob at both `88dcdf76` and `a6be8816` (a script, 6 of 6).

## 2. Clauses relied on (quoted), and the class ruling

- **CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`, at `a6be8816`):
  - Lines 18-20: "Changes touching any of seven classes require review by an independent, fresh-context reviewer,
    and the agent performing the change never finally decides which classes it touches."
  - Line 37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - Lines 40-41: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external
    consumer can depend on;"
  - Line 51: "**A reviewer or the owner** may reclassify at any time."
- **GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
  - Lines 52-55, four list lines joined: "\"Behavior-preserving\" means none of the following changes: / a rendered
    byte, a wire format, a refusal string or an exit code; / a signed or digest-bound artifact; / a consent,
    security or retention decision."
  - Line 62: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic
    observation) or class 4 (security), and class-6 pull requests that remove an endpoint."
- **AGENTS.md** at `a6be8816`:
  - Rule 2 (line 120): "No \"zero / all / 100%\" claim without running that exact sweep this session, confirmed by a
    second method."
  - Rule 6 (line 126): "Mutate the input and confirm the check fails, per predicate, before trusting it".
  - Rule 9 (line 132): "A claim of absence needs a sweep with a denominator."
  - Rule 11 (lines 134-135): "An evidence record names its subject and the subject's digest; a record that names
    neither cannot be re-checked against the bytes it describes."
  - Guardrail (line 263): "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it
    ran at".
  - Guardrail (line 271): "Fail-closed polarity: withdrawal defeats grant; future-dated evidence is stale; no
    evidence → Unknown."
- **The bead** (`bd show syzygy-bpyt.4.10`), acceptance criteria: "1. Diagnosis recorded with its commit: a clean
  three-surface-poc-app run with a fresh TMPDIR leaves 0; the 42 helper-using files alone leave 0; 0 of 39 callers
  fail to drain; killed runs (SIGKILL, SIGTERM) leak; the /tmp population's mtime bursts. 2. Fixture copies and
  templates carry the owner PID; a once-per-run sweep removes only PID-named fixture directories whose PID is dead
  (ESRCH), never a live PID, never a legacy name. 3. SIGKILL a run, then one fresh run: 0 dead-PID fixture
  directories remain; rule-6 mutant with the sweep disabled leaves them (recorded). 4. Tests show a live-PID
  directory and a legacy-name directory survive the sweep. 5. Suite green; Tests: +a ~b -c; class none."
  - Bead comment (2026-10-21 22:37): "the fix is PID-named fixture directories plus a once-per-run sweep of dead-PID
    directories."
- **The coordinator's rulings** as the brief gives them: "drop the per-file hook; name directories by owner pid and
  sweep dead pids once per run; sweep only the run's own TMPDIR; follow no symlinks; EPERM counts as alive; never
  remove a live pid's or a legacy (no-pid) name".
- **The brief's verdict rule:** "A path by which the sweep could delete a directory it did not create is blocking,
  and so is an unrepaired F from round 1 or 2."
- **Test-rigor bar** (`th-engineering/subskills/test-rigor/SKILL.md`):
  - Core rule: "A test is worth keeping only if some plausible bug makes it fail."
  - Bar 3: "Edge and failure paths are first-class — Empty inputs, boundaries, invalid states, error branches, and
    concurrency-sensitive paths get tests proportional to blast radius."
  - Bar 4: "Expected values are literals or independently derived."
  - Bar 5: "Mock only at boundaries you don't own — Network, clock, filesystem, third-party services."
  - Bar 6: "Deterministic or quarantined — A test that fails intermittently is worse than no test".
  - Bar 10: "A test is worth *adding* only if it catches a plausible bug no existing test catches".

**Class ruling (mine): none.** The change is test support, plus one operator CLI that removes dead runs' fixture
directories at its start.
- I considered whether the CLI's deletion changes the class. **It does not.**
  - Class 4 covers "anything under SEC-1…SEC-5". The CLI writes nothing into a governed repository. It removes host
    scratch directories under its own temp directory, adds no auth surface and opens no egress path.
  - Class 6: the CLI's exit code and stderr line are unchanged in my probe (section 6). Nothing an external consumer
    can depend on changes.
  - The daemon does not import the new module. `git grep -l -F fixture-directories -- apps packages scripts` lists 5
    files: the module's test, the CLI, the global setup, the fixture helper and its test.
  - Classes 1, 2, 3, 5 and 7 are not touched.
- **GP-Q0's three extra checks do not apply.** They cover class 1, class 3, class 4 and class-6 pull requests that
  remove an endpoint, and none of those is touched.
- Under GP-Q0's list, no rendered byte, wire format, refusal string, exit code or digest-bound artifact changes.
  Removing synthetic test fixtures is not a consent, security or retention decision about governed or observed data.
  I judge deletion safety under the brief's verdict rule.

## 3. What I ran and the results

Two scratch clones of `a6be8816` were used:
- `clone`: typecheck, the suites, governance, the CLI probe;
- `mut`: the mutants and the kill probe.

`npm ci` exited 0 in both. Node v24.6.0, Vitest 3.2.7, `/usr/bin/bwrap`. The load average was 14.78 at the start,
25.60 after the app run, and 9.86 on resuming.

| # | Run (cwd = a clone) | Result [Observed, verbatim where quoted] |
|---|---|---|
| 1 | `npm run typecheck` | prints only the `tsc -b …` line; exit 0 |
| 2 | `fixture-directories.test.ts` + `test-model-fixture.test.ts`, TMPDIR=/tmp/r509c-1 | "fixture-directories.test.ts (16 tests) 966ms", "test-model-fixture.test.ts (5 tests) 535ms", " Test Files  2 passed (2)", "      Tests  21 passed (21)"; exit 0. The TMPDIR held only `node-compile-cache` afterwards |
| 3 | The app project, TMPDIR=/tmp/r509c-2 | " Test Files  89 passed \| 1 skipped (90)" / "      Tests  1113 passed \| 2 skipped (1115)" / "Duration  139.91s"; exit 0. No timeouts. **0 fixture directories left**; the TMPDIR held 4 `.com.google.Chrome.*` directories and `node-compile-cache` |
| 4 | `python3 scripts/check_governance.py` | "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted"; exit 0 |
| 5 | Hosted CI at `a6be8816` (`gh pr checks 509`; runs 39791579713 node-ci and 39791579692 governance-docs) | "checks pass 2m1s", "node pass 3m49s". From the node-ci log: "Test Files  233 passed \| 3 skipped (236)", "Tests  5126 passed \| 5 skipped (5131)"; the system tier "Test Files  9 passed (9)", "Tests  48 passed (48)"; "fixture-directories.test.ts (16 tests) 695ms", "test-model-fixture.test.ts (5 tests) 324ms" |
| 6 | `ns_probe.py` (F5 reproduction), reviewed module, `/tmp/r509c-3` | section 4, F5 |
| 7 | `ns_probe.py`, the round-2 fallback restored as a mutant, `/tmp/r509c-4` | section 4, F5 |
| 8 | `my_mutants.py`, 11 mutants plus a control, in `mut`, TMPDIR=/tmp/r509c-5 | control: exit 0, 21 passed, 0 failing. **11 of 11 killed**, each by an `AssertionError` in a named test, with 0 timeouts or `STACK_TRACE_ERROR`. "survivors []". The source was restored, and its sha256 was checked after each mutant (section 8) |
| 9 | `fixture-directories.test.ts` inside `bwrap --unshare-user --unshare-pid --tmpfs /proc`, TMPDIR=/tmp/r509c-6 | "(16 tests \| 2 failed \| 7 skipped)". The two failures are the two F5 tests: "→ expected [ …(2) ] to deeply equal [ …(3) ]" (N12). Vitest then did not exit, as in round 2's run 15; my `timeout -k 10 400` stopped it (exit 124). `find_mine.py` then found no leftover process |
| 10 | `kill_probe.py` in `mut`, TMPDIR=/tmp/r509c-7: SIGKILL at 3 copies, then one fresh app-project run | AC3 (below) |
| 11 | `cli_probe.py`, the built CLI, on the host (`/tmp/r509c-11`) and without `/proc` (`/tmp/r509c-12`) | section 4, F2; section 6 |
| 12 | The evidence JSON, read by script, never whole (24 records) | section 4, N9 and rules 6 and 11 |
| 13 | `rmSync(link, {recursive: true, force: true})` on a symlink to a directory, in `/tmp/r509c-8` | prints `false true`: the link is gone and the target's file is intact |

**Run 10 detail** [Observed, `kill-probe.json` sha256 `10458f4b974d6cb1b68ef77cf7d9fe93b714b9b23472f4c34fe1fb6e80c60da1`]:
- The record names `treeCommit` `a6be8816…` and the sha256 of the four code files.
- The app project started in a new session. At 7.1 s, 3 copies and 3 templates existed, owned by the live pids
  2890530, 2890546 and 2890567, all `n4026531836`. SIGKILL went to that session's process group, by its pgid.
- Five seconds later: **6 dead-pid directories**, 0 live, 0 legacy. 0 processes of mine named the TMPDIR in argv or
  environ, so no orphan was stopped.
- The fresh run printed "Test Files  89 passed | 1 skipped (90)" and "Tests  1113 passed | 2 skipped (1115)"; exit 0,
  220.4 s.
- Afterwards: **0 dead-pid directories**, 0 live, 0 legacy, and 0 processes naming the TMPDIR.
- The 7 non-fixture entries present after the kill were all still present after the fresh run (`syzygy-public-screen-*`,
  `syzygy-trigger-*`, `syzygy-dossier-src-*`, `node-compile-cache` and one random-named directory). The fresh run
  added two `.com.google.Chrome.*`. **The sweep removed no entry outside its prefix.**

## 4. Rounds 1 and 2's findings

### F5 (round 2, blocking) — the `0` fallback treated every namespace without a readable `/proc` as one: **repaired**

- [Observed] Code: `pidNamespace()` returns `string | undefined` (`fixture-directories.ts:24-30`). It returns
  `undefined` when `readlinkSync` throws and when the reading names no inode (`?.[1]`). The sweep reads it first and
  returns before `readdirSync`: `const namespace = pidNamespace(); if (namespace === undefined) return;` (lines 56-57).
  - Names keep `n${pidNamespace() ?? '0'}` (lines 12-13).
  - **Nothing still reads `0` as a namespace.** In the sweep, `namespace` comes only from `pidNamespace()`. That
    function yields `undefined` or the inode digits; it can give `0` only for a literal `pid:[0]`, and no namespace
    has inode 0 [Inferred]. Every `n0` name therefore fails `owner[2] !== namespace` for every sweeper that has a
    reading.
- [Observed] Doc comment (lines 15-23 and 43-44): "Where that link cannot be read (no `/proc`, or a sandbox that mounts
  a tmpfs over it) there is no reading, and no reading is no evidence … names are still made, with `n0`, but the
  process sweeps nothing." The PR body has the same sentence and the residual "**No namespace reading, no sweep.**
  Where `/proc/self/ns/pid` cannot be read (macOS, which has no `/proc`; a sandbox with a tmpfs over `/proc`) a run
  never sweeps".
- [Observed] Tests: `removes nothing, and lists nothing, where the PID namespace %s, …` (`fixture-directories.test.ts`
  lines 145-186). It is an `it.each` over "cannot be read" (throws ENOENT) and "names no inode" (`'pid:[]'`), with
  `node:fs` mocked through `vi.doMock`. It asserts that the three names survive and that `listings` is `[]`.
- [Observed] **The round-2 probe, reproduced** (run 6, `ns-probe-head.json` sha256
  `8191c65f70f05e8980f7f154a0b2cc5161c47a48c4789736f4ad442a9377e8c8`). The module is `fixture-directories.head.mjs`,
  sha256 `2bf2fe12d1deb358fd3ebb0848ae56c94fede9db376bcfda1f3fb01cc26eba5e`, equal to `tsc`'s
  `dist/fixture-directories.js` from the reviewed source. Three live holders ran, each sandboxed holder's inner pid
  pushed to 63 first:
  - `--tmpfs /proc`: `syzygy-poc-surface-fixture-p63-n0-VUveTb`, reading "unreadable:ENOENT";
  - `--proc /proc`: `…-p63-n4026539611-Sn9LhP`;
  - host: `…-p2749016-n4026531836-9iGeJ7`.

  The sweepers printed:
  - "sweeper no-proc exit 0 unreadable:ENOENT signal0 {'63': 'ESRCH', '2749016': 'ESRCH'} listings 0 removed []".
    The sweeper in a second `--tmpfs /proc` sandbox saw pid 63 as ESRCH and listed nothing. It removed nothing, not
    even its own dead-pid control `p9-n0-CTRL01`, which stayed: the stated residual.
  - "sweeper proc … removed ['syzygy-poc-surface-fixture-p9-n4026539621-CTRL01']";
  - "sweeper host … signal0 {'63': 'EPERM', '2749016': 'alive'} … removed ['…-p2750398-n4026531836-CTRL01']".

  All three holders recorded `goneWhileAlive False` and `existsAtStop True`. **The no-`/proc` holder's directory
  survived.**
- [Observed] **The probe discriminates** (run 7, `ns-probe-reads-as-0.json` sha256
  `7ba611c4b50c11dc3a6c811aeaa0f044cef405914541cfb9f4f810ee7790778c`). With the round-2 fallback restored in the
  built module (`?.[1]` → `?.[1] ?? '0'` and `return undefined;` → `return '0';`; the mutant's sha256 is
  `c154cf7c56150c1ac48f1370c53eb276461486aea6638480e8aba34dc5b7273e`), the output was "holder no-proc
  syzygy-poc-surface-fixture-p63-n0-jBYKQm … goneWhileAlive True goneAfterMs 808 existsAtStop False" and "sweeper
  no-proc … listings 1 removed ['syzygy-poc-surface-fixture-p63-n0-jBYKQm', 'syzygy-poc-surface-fixture-p9-n0-CTRL01']".
- [Observed] Rule-6 mutants (run 8):
  - **`drop-early-return`** deletes `  if (namespace === undefined) return;\n`. It is killed by both `it.each` cases:
    "AssertionError: expected [ Array(1) ] to deeply equal []", the `listings` assertion.
    - [Inferred from the code] Dropping only the early return is not dangerous by itself: `owner[2] !== undefined`
      holds for every name, so nothing is removed and only the listing betrays it. The dangerous form is the
      fallback, which the next two mutants and run 7 cover.
  - `unreadable-reads-as-0`: killed by "cannot be read", "expected [ Array(1) ] to deeply equal [ …(3) ]".
  - `unparseable-reads-as-0`: killed by "names no inode", with the same assertion.
  - `empty-inode-accepted` (`(\d+)` → `(\d*)` in the reading): killed, "expected
    'syzygy-poc-surface-fixture-p2775159-n-' to be …".
- [Observed] The lane's record has `unreadable-namespace-reads-as-0`, `unparseable-namespace-reads-as-0` and
  `unreadable-namespace-still-lists` killed, and its `ns-sandbox-probe-mutant` holder `bwrap-no-proc` has
  `goneWhileAlive: true`, `goneAfterMs: 4839`.
- **Verdict: repaired.** One gap remains: the F5 tests themselves fail on a host where the namespace cannot be read
  (N12). That is a test-portability defect, not a deletion path.

### N7 (round 2) — one kernel only: **accepted residual, stated**

- [Observed] The PR body's residuals: "**N7: one kernel only.** A namespace inode identifies a namespace within one
  running kernel. A `TMPDIR` shared between kernels (an NFS mount, a directory a virtual machine shares) is out of
  scope; here `/tmp` is a local tmpfs." The doc comment adds "The inode identifies a namespace within one running
  kernel only." (line 22).

### N8 (round 2) — prefix and extension namespaces: **repaired**

- [Observed] The foreign-namespace test (lines 130-142) now keeps the names of `OTHER_NS`, `NS.slice(0, -1)` and
  `` `${NS}0` ``, each as a copy and as a template.
- [Observed] My `namespace-prefix-match` (`owner[2] !== namespace` → `!namespace.startsWith(owner[2])`) is
  **killed**: "expected [ …(4) ] to deeply equal [ …(6) ]". So is `namespace-extension-match`
  (`!owner[2].startsWith(namespace)`), with the same assertion. The lane's record has both killed.

### N9 (round 2) — abbreviated commits and unchecked HEAD: **repaired**

- [Observed] `interrupt_probe.py:45-46`: `assert run_git('rev-parse', 'HEAD') == run_git('rev-parse', COMMIT), 'the
  worktree must be at <tree-commit>'`, then `FULL_COMMIT = run_git('rev-parse', 'HEAD')`, which is written as
  `treeCommit` (line 97). `kill_then_fresh_run.py:65-67`, `cli_sweep_probe.py:53`, `ns_sandbox_probe.py:39` and
  `mutate_sweep.py:125` resolve or assert HEAD the same way.
- [Observed] A script over all 24 JSON records found commit-like values (7–40 hex in a field named
  commit/head/base) in 19 of them. Every value is 40 hex, except:
  - the three records round 2 named (`interrupt-kill-base` and `leak-by-file-base` at `0d4d5098`;
    `tmpdir-length-probe` at `d8532f1a`);
  - `diagnosis-2026-10-22.json`, which carries the same `0d4d5098` in `.perFileAtBase.treeCommit` and
    `.interruptedRuns.base.treeCommit`. These are copies of the first two records, and the same file names the full
    `0d4d50984f6aa501217fe7109b6aec1b9679e4c9` elsewhere. I raise no finding.
- [Observed] `abbreviated-commits-2026-10-22.json` gives each of the three a full hash. `git rev-parse` and
  `--disambiguate` each resolve `0d4d5098` to one commit, `0d4d50984f6aa501217fe7109b6aec1b9679e4c9`, and `d8532f1a`
  to one commit, `d8532f1afdf965439c70ee6f6f3f1836b3c81bc9`, as the note says. The three records are not rewritten.
- [Observed] `sha256AtCommit`, checked by script against `git show <treeCommit>:<path>` for all 10 records that carry
  it:
  - all match;
  - `clean-run-head`, `interrupt-term-head`, `kill-then-fresh-run-head` and `kill-then-fresh-run-sweep-disabled` cover
    the four code files;
  - `mutants-sweep` covers six files.
  - The remainder: `term-then-fresh-run-head` (carried at `3f08143c`, not re-run) still hashes `vitest.config.ts`
    only. `verification-2026-10-22.json` `round2.carried.why` says why it was not re-run. Its full `treeCommit` keeps
    it re-checkable, which is why round 2 called this "a convenience gap, not a rule-11 failure".

### N10 (round 2) — unguarded TMPDIR removal in the evidence scripts: **repaired for the four named tools**

- [Observed] `private_directory()` sits in `interrupt_probe.py:27-38`, `kill_then_fresh_run.py:35`,
  `cli_sweep_probe.py:32` and `mutate_sweep.py:36`. It refuses `/`, `tempfile.gettempdir()`, `$TMPDIR` (or `/tmp`)
  and `$HOME`, any ancestor of those, and an existing non-empty directory. Each tool calls it before its first
  removal (`interrupt_probe.py:49`, `kill_then_fresh_run.py:68`, `cli_sweep_probe.py:58`, `mutate_sweep.py:50`).
  `ns_sandbox_probe.py:41-43` asserts the same inline.
- [Observed] The lane's `guard-probe` record: 24 of 24 refusals, 12 of 12 predicate mutants and 4 of 4 wiring mutants
  killed (`treeCommit` `88dcdf76…`).
- [Observed] Round 2's N10 named exactly these four tools. **A fifth tool that empties directories under a scratch
  argument, `leak_by_file.py`, has no guard (N13).**

### N11 (round 2) — out of scope, filed as `syzygy-bpyt.4.18`

- [Observed] The PR body says so. My kill probe reproduces the class: 7 other `syzygy-*` and random-named scratch
  entries survive the kill and the fresh run, and this sweep rightly leaves them alone.

### Round 1: F1–F4 and N1–N3, briefly

- **F1** (other PID namespaces) — **still repaired.** In run 6 the `--proc` sweeper saw both other holders' pids as
  ESRCH and kept both directories. My `namespace-*` mutants and the lane's `foreign-namespace-swept` are killed.
- **F2** (once per run) — **still repaired.**
  - The test `is registered as a global setup of the app project and of no other project, so it runs once per run`
    passes. The lane's `global-setup-not-registered`, `global-setup-on-every-project` and `sweep-per-file` are
    killed, each with its old/new fragment stored.
  - In my kill probe, one fresh run removed all 6 dead-pid directories.
  - The CLI sweeps at its start. Run 11 on the host: exit 2, stderr "No Chrome/Chromium found on PATH and
    SYZYGY_POC_BROWSER is unset; nothing measured.", and it removed exactly
    `syzygy-poc-surface-fixture-p1181929-n4026531836-DEAD01` and `…-template-p1181929-n4026531836-DEAD02`. It kept
    8 entries: a live copy and template, two legacy names, a foreign namespace, an `n0` name, a file and a symlink.
    The symlink's target was intact.
- **F3** (`lstat`, `isDirectory()`, uid) — **still repaired.**
  - `fixture-directories.ts:69-71`.
  - Mutants: my `lstat-follows-links` is killed ("expected [ Array(1) ] to deeply equal [ …(2) ]"), my
    `uid-guard-dropped` is killed ("expected [] to deeply equal [ Array(1) ]"), and my `uid-undefined-means-keep` is
    killed. The lane's `is-directory-guard-dropped` is killed.
  - Run 13: `rmSync` on a symlink removes the link, not its target.
- **F4** (SIGTERM record) — **still repaired.**
  - `interrupt-term-head` (at `88dcdf76`): 3 copies and 2 templates at the signal and at 80 s.
  - `term-then-fresh-run-head` (at `3f08143c`): 5 dead-pid directories 5 s after the signal, and `left 0` after the
    fresh run.
  - I did not re-run SIGTERM myself.
- **N1** (`readdirSync` in a `try`): lines 58-63 still have it; the lane's `readdir-outside-try` is killed.
- **N2** (the foreign-owner claim): the PR body says "The uid guard is tested by a spy. No second user id was
  available."
- **N3** (mutation hygiene): `mutate_sweep.py:193-197` restores the files and removes both the private TMPDIR and
  `report.parent` in its final `finally`.

## 5. New findings

### N12 — note — the two F5 tests fail wherever the PID namespace cannot be read, though their comment says they run everywhere

- **Severity:** note. No deletion path. It breaks a test's own portability claim on hosts this repository's CI does
  not use.
- **Evidence:**
  - [Observed] `fixture-directories.test.ts:19`: `const NS = ownNamespace() ?? '0';`. Lines 21-23: "Tests of what
    the sweep keeps, and the test of the unreadable case, run everywhere."
  - [Observed] In the F5 test, `unread` (lines 153-157) holds `` `${FIXTURE_PREFIX}p${dead}-n0-AbCdEf` `` (line 154)
    and `` `${FIXTURE_PREFIX}p${dead}-n${NS}-AbCdEf` `` (line 156). Where `ownNamespace()` is `undefined`, `NS` is
    `'0'` and the two names are identical. `make()` creates one directory, so `entries(tmp)` has 2 names against an
    expected 3.
  - [Observed] Run 9, inside `bwrap --unshare-user --unshare-pid --tmpfs /proc`: "× … removes nothing, and lists
    nothing, where the PID namespace cannot be read, … → expected [ …(2) ] to deeply equal [ …(3) ]" and the same for
    "… names no inode …". The file reported "(16 tests | 2 failed | 7 skipped)". The sweep itself behaved correctly
    there: it listed nothing and removed nothing.
- **Failure scenario:** someone runs the app project on macOS or in a sandbox without `/proc`, the environments the
  test's `it.skipIf` guard exists for. The two tests that pin the fail-closed behaviour fail red for a test-data
  reason, which trains readers to ignore exactly the F5 regression test. A later "fix" that relaxes the assertion
  would also hide a real regression.
- **Proposed fix:** give the third `unread` entry a suffix of its own (for example `-n${NS}-Own123`, as the
  foreign-namespace test already does at line 139), so the three names stay distinct when `NS` is `'0'`. Re-run run
  9's sandbox command and record "16 tests | 0 failed | 7 skipped". Otherwise, narrow the comment at lines 21-23 so
  it no longer says the unreadable case runs everywhere.

### N13 — note — `leak_by_file.py` empties directories under its scratch argument with no guard, and the PR body counts four guarded tools where five take a scratch directory

- **Severity:** note. Evidence tooling only. The suite never runs it.
- **Evidence:**
  - [Observed] `leak_by_file.py:23` takes `<scratch-tmp-root>` from `sys.argv[3]`. Lines 36-37 run `scratch = tmp_root
    / f'f{index:02d}'` then `shutil.rmtree(scratch, ignore_errors=True)`, for each of the 44 fixture-using files, and
    line 53 removes it again after counting. It never calls `private_directory()` or any equivalent check (`grep -n
    'rmtree\|mkdtemp\|gettempdir\|private_dir' leak_by_file.py` shows only lines 37 and 53).
  - [Observed] The PR body's N10 row: "The four evidence tools that take a scratch directory refuse
    `tempfile.gettempdir()`, `/`, `$HOME` and an existing non-empty directory." `guard_probe.py`'s population is those
    four. `leak_by_file.py` also takes one.
  - [Observed] Round 2's N10 did not name this file, so this is a gap of the same class, not an unrepaired item.
- **Failure scenario:** someone re-running `leak-by-file-*` cold passes `/tmp` or `$HOME` as the scratch root. The
  script then removes any existing `f00`…`f43` there that the user owns, for example another session's scratch, before
  each file's run.
- **Proposed fix:** call the same `private_directory()` on `tmp_root` before the loop, or create the root with
  `tempfile.mkdtemp`. Add `leak_by_file.py` to `guard_probe.py`'s tool list and wiring check. Otherwise, have the PR
  body say "four of the five" and name the fifth.

## 6. Every changed output

**None outside the temp-directory names and the dead-process directories the sweep removes.**
- [Observed] Outside the evidence directory, the diff is the 7 files of section 1. In `polaris-accessibility-main.ts`
  it adds one import, two comment lines and one call, the first statement of `main()`.
  - Run 11 on the host shows exit 2 and the unchanged stderr line "No Chrome/Chromium found on PATH and
    SYZYGY_POC_BROWSER is unset; nothing measured.".
  - **The F5 change reaches the CLI.** The same CLI inside `--tmpfs /proc` also exited 2 with the same line, and
    removed nothing ("no-proc exit 2 … removed [] kept 10 outsideIntact True"; `cli-probe.json` sha256
    `6080c22f6d4f37e65c96b196634aa74253c04a3329ef098891f6ffc0de37a686`).
  - The call cannot throw, so it cannot change an exit code [Inferred from the code]. The namespace read, the
    listing, `process.kill` and the `lstat`/`rmSync` pair are each inside a `try`; the rest is string work.
- **What a CLI user can lose:** only entries of `os.tmpdir()` that meet every one of these conditions [Inferred from
  the code, runs 6, 10 and 11]:
  - the name matches `^syzygy-poc-surface-fixture-(?:template-)?p(\d+)-n(\d+)-`;
  - the namespace segment equals the CLI's own readable inode;
  - the pid answers ESRCH;
  - `lstat` says it is a directory, owned by the user.

  `os.tmpdir()` is `/tmp` when TMPDIR is unset. That is where the CLI's own fixtures go, so it is the run's own
  TMPDIR, as ruled.
- [Observed] The fixture names change only by `p<pid>-n<ns>-` before the random suffix
  (`test-model-fixture.test.ts` pins the form). No served route, rendered page, wire format, refusal string,
  digest-bound artifact, `.syzygy/**` or `openspec/**` file changes.

## 7. Verdict per acceptance criterion

| AC | Verdict | Basis |
|---|---|---|
| 1 Diagnosis recorded | **Met** | [Observed] `diagnosis-2026-10-22.json` names the base in full (`0d4d50984f6a…`) and holds the clean run, the per-file runs, the caller scan, the SIGKILL and SIGTERM probes and the `/tmp` census. The AC's "39 callers" is an earlier count; the PR body discloses the record's own population (42 at base, 43 at the code commit) |
| 2 PID naming; once-per-run sweep of dead PIDs only, never a live PID, never a legacy name | **Met** | [Observed] Naming: the `test-model-fixture.test.ts` name test and runs 6 and 10. ESRCH only, with EPERM and an out-of-range pid kept: `eperm-counts-dead` is killed. Legacy kept: `name-anchor-dropped` is killed, and the CLI probe keeps legacy names. Once per run: the config pin and the global-setup mutants. **"Never a live PID" now holds without `/proc` too** (runs 6 and 7) |
| 3 SIGKILL then one fresh run leaves 0; sweep-disabled mutant leaves them | **Met** | [Observed] Run 10: 6 dead-pid directories after SIGKILL, 0 after one fresh run (exit 0). The lane's `kill-then-fresh-run-sweep-disabled` (at `88dcdf76`, mutant `global-setup-not-registered`, old/new stored) leaves 5 |
| 4 Live-PID and legacy names survive, in tests | **Met** | [Observed] `keeps the directories of a live process, the current one included` and `keeps a name that carries no pid and namespace segment, whatever its suffix` (13 shapes) pass; the lane's `live-pid-removed` and `name-without-pid-is-dead` are killed |
| 5 Suite green; Tests +a ~b -c; class none | **Met** | [Observed] The app project is green locally (run 3) and hosted CI is green at `a6be8816` (5126 passed, 0 failed). **`Tests: +18 ~0 -0` is verified:** `fixture-directories.test.ts` is new (absent at `9a30237e`) with 15 test calls, one an `it.each` of 2 rows, so 16 tests, as Vitest reports. `test-model-fixture.test.ts` goes from 3 tests to 5, the three base names unchanged. These two are the only test files in the diff. Class none (section 2). The PR body's battery figure (110/0) is lane-reported; I did not re-run the battery |

## 8. Test quality

- **Plausible bugs caught** [Observed]:
  - my 11 mutants: the early return, both fallbacks, an empty-inode reading, prefix and extension namespace
    matching, both uid polarities, the name anchor, EPERM-as-dead and `stat` for `lstat`;
  - the lane's 27 (`mutants-sweep`, all with old/new and `treeCommit` `88dcdf76…`; 50 failing-test entries, every
    one an `AssertionError` first line, 0 load-bound).

  Each kill is a named assertion. **Survivors: none** across 38 mutants (11 + 27).
- **Bar 1 and bar 5:** assertions are directory listings, plus the `listings` array that records whether
  `readdirSync` ran. That array is an effect, and it is the doc comment's claim ("does not list the directory").
  - Only the boundaries the code does not own are simulated: `process.kill` (EPERM), `process.getuid`, `os.tmpdir`
    and now `node:fs`'s `readlinkSync`/`readdirSync` in the F5 test.
  - The `node:fs` mock forwards every other path to the real function, and is undone in a `finally` (`doUnmock`,
    `resetModules`).
- **Bar 4:** the namespace is derived independently: each test file's `ownNamespace()` re-reads `/proc` and imports
  nothing from the module. ESRCH comes from a really reaped child, checked before use.
- **Bar 3:** the edge paths are tested in proportion to the risk:
  - an unreadable and an unparseable namespace;
  - three foreign namespace values;
  - unlistable and absent directories, and a removal failure;
  - a file, a symlink, another uid, no uid, an out-of-range pid and 13 name shapes.
- **Bar 6, determinism and cleanup:**
  - The two files passed in every unmutated run I made: alone (run 2), in the app project (run 3), in both fresh runs
    of the kill probe, as the mutant control (run 8), and on hosted CI. I saw no timeout, so `syzygy-bpyt.4.13` did
    not arise.
  - The spawned child in `deadPid()` is `node -e ''`, which exits by itself; a spawn error rejects `once` instead of
    hanging.
  - `chmod`, `getuid` and the module mocks are restored in a `finally`; private directories are removed in
    `afterEach`.
  - The one environment-dependent failure is N12.
- **Bar 10, growth:** +18 tests. Each pins a distinct predicate, as the mutant kills show, and none duplicates
  another. The two F5 cases share one body through `it.each`, which suits two readings of one boundary.

## 9. Cleanup

- Processes: `find_mine.py` lists this user's processes whose argv or environ names `/tmp/r509c-`. After every run,
  and again after resuming, it found only my own shell, whose command line contained the search string. Nothing was
  killed by pattern. Run 9's sandboxed Vitest was ended by `timeout`, on its own pid; the kill probe's process group
  was signalled by its own pgid.
- Directories: I deleted `/tmp/r509c-1` to `-4`, `-6` to `-8`, `-10` and `-10-outside`. `-10` and `-10-outside` were
  half-seeded by the first CLI-probe attempt, which failed on a PATH without `bwrap`. `my_mutants.py` removed
  `-5`. `cli_probe.py` removed `-11`, `-12` and their `-outside` targets itself. `-9` was never left behind. I
  deleted nothing in `/tmp` outside my own TMPDIRs.
- I deleted both scratch clones, `…/scratchpad/rev-509c/clone` and `…/scratchpad/rev-509c/mut`.
- `bd show` and `bd comments` were first run with the scratch clone as cwd, where no such issue exists. They printed
  "not found", and left only an untracked `.beads.gate.lock` and ignored lock files inside that clone, which is now
  deleted. I re-ran them from `/home/tze/GitHub/syzygy`, read-only. I made no `bd` mutation, push, PR comment or
  merge, and no edit under `/home/tze/GitHub/syzygy/.worktrees/`. I read no observed repository and opened no
  credential file.
- Tools and results are kept in
  `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-509c/tools/`:
  - scripts: `ns_probe.py`, `holder.mjs`, `sweeper.mjs`, `my_mutants.py`, `kill_probe.py`, `cli_probe.py` and
    `find_mine.py`;
  - module copies: `fixture-directories.head.mjs` and `fixture-directories.reads-as-0.mjs`;
  - results: `ns-probe-head.json`, `ns-probe-reads-as-0.json`, the per-role `r509c-3-*`/`r509c-4-*` records,
    `my-mutants.json` (sha256 `60897615ba6778aa01a7b2ef3ab73d7f3f6d660354471e8c6fb1ec1862dde32d`) with its 12
    per-run Vitest reports, `kill-probe.json` with its two run logs, `cli-probe.json` and `noproc-vitest.log` (sha256
    `d1d74fa67af2838dae6de65e3fb0dd6b107faf95fd910ac06cd51b0f58ec38e6`).
