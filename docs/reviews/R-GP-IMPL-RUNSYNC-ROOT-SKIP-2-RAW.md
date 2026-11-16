# R-GP-IMPL-RUNSYNC-ROOT-SKIP-2 — CC-REV-1 implementation review of syzygy-bpyt.4.22 and syzygy-bpyt.4.25, round 2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 7459cc75
Subject: r2-review.diff sha256 05f284e45d8f33720460623ecf418c1e8437b35823412ab9a8f9c751dadebf32

Reviewer: rev-525b, an independent fresh-context reviewer (Claude Opus 5.5), 2026-10-25. I did not author the change or round 1,
and did not share either session. No observed-repository content was fetched or read. No credential file was opened. No bd
mutation, push, PR comment or merge was made, and no worktree under `/home/tze/GitHub/syzygy/.worktrees/` was touched. The one bd
call was a read (`bd list --all --json`).
Environment: Node v24.6.0, a scratch clone of `/home/tze/GitHub/syzygy` at `7459cc75` with `npm ci` and `npm run build`, 12 cores,
load1 between about 11 and 58 while I ran. In paths below, `<r>` stands for
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-525b/`. In quoted process argv, `<tree>`
is the probe's mask for the clone's path.

**Scope.** This round checks only the F1 repair and the record and PR-body corrections for N1–N3. It does not re-review what round 1
cleared outside the delta `f7bbb93a..7459cc75`.

**Summary.**
- F1 is repaired. Round 1's three fragments are applied exactly. Nothing else in the test file changed except the comment.
- P1 is killed at head by the governed-plane row alone. It survives the prior head's file. P2 is killed at head by `ETIMEDOUT`.
- R5 and R9 at head fail by `ETIMEDOUT`, with nothing on 7477 and no survivor.
- The governed-plane row does not depend on the runner's environment. The test's `ENV` strips every `SYZYGY_` variable.
- The comment is true as stated.
- The record checks clean against the git objects: 129 of 129 checks.
- The PR body's changed claims match the record, and its class line is verbatim.
- The classes stay 1 and 6.

**Findings, one line each:**
- **N5** (low): the record cites round 1's T1 as the evidence for the `SYZYGY_PORT=0` predicate. But T1's `old` fragment no longer
  occurs in the head file, because the F1 repair moved the predicate into `portEnv`'s default. This review's `T1-head-R5` is the
  run in the head's form; the disposition should cite it.

## 1. Subject identity checks

All [Observed], by script.

| Check | Result |
|---|---|
| Frozen subject | `sha256sum …/lead/b422/r2-review.diff` → `05f284e45d8f33720460623ecf418c1e8437b35823412ab9a8f9c751dadebf32`. **Matches** the brief. |
| Frozen delta | `sha256sum …/lead/b422/r2-delta.diff` → `3287213de6559c1997500c5fa350a76228e52d0e1773e6859695c6581248c2fb`. **Matches** the brief. |
| Re-derived subject | `git diff 3ec6929951080613b3c5cb7205fe303c5449be58 7459cc7585205e270f90173737c6d59786af650a --output=…` → `05f284e4…dadebf32`. **Matches**, byte for byte. |
| Re-derived delta | `git diff f7bbb93a 7459cc7585205e270f90173737c6d59786af650a --output=…` → `3287213d…1248c2fb`. **Matches**, byte for byte. |
| Branch head | `git ls-remote https://github.com/Tzeusy/syzygy refs/heads/agent/syzygy-bpyt.4.22` → `7459cc7585205e270f90173737c6d59786af650a`. `gh pr view 525` gives the same `headRefOid` and 7 commits. |
| Fast-forward | `git merge-base --is-ancestor f7bbb93a 7459cc75` succeeds. |
| Base | `git merge-base 7459cc75 a088f1caf061c1a2062527ce8521c9b64c3c7fd1` → `3ec6929951080613b3c5cb7205fe303c5449be58`. Main is `a088f1ca` (`ls-remote`). |
| Subject size | `--numstat 3ec69299 7459cc75`: 1275/0 record, 258/0 tool, 13/3 `daemon-entry-unchanged.system.test.ts`, 3/1 `state-dir.system.test.ts`. 4 files, **+1,549/−4**, as briefed. |
| Delta size | `--numstat f7bbb93a 7459cc75`: 620/98 record, 104/37 tool, 6/4 `daemon-entry-unchanged.system.test.ts`. 3 files, **+730/−139**, as briefed. |
| Delta commits | `67f2db90` changes only `daemon-entry-unchanged.system.test.ts`. `821d807c` changes only the tool. `7459cc75` changes only the record. |
| Main since base | `git diff --name-only 3ec69299 a088f1ca`: 244 paths (`<r>main-since-base.txt`). **None is a subject path**: 0 of 4 subject paths are in it. No path in it lies under `docs/evidence/syzygy-bpyt-4-22/`, `packages/cap1-system/`, `apps/syzygy/`, `packages/cap1-daemon/` or `docs/evidence/syzygy-bpyt-8-2/`, and none is `packages/polaris-dossier/src/argv.ts` (`grep -c -F` over those 6 needles: 0). |
| Product bytes | None changed. `git diff --stat 3ec69299 7459cc75 -- apps packages/cap1-daemon packages/polaris-dossier` is empty. The two code paths are `.system.test.ts` files in `packages/cap1-system`, and the rest is evidence. |

## 2. Clauses relied on (quoted), and the class ruling

Quoted at `7459cc75`.

- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
  - `:31-32`: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
  - `:40-41`: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
  - `:45-46`: "**Class membership is contested by default and is never finally determined by the agent performing the change**"
  - `:49-50`: "**The change record states** which classes the change touches, or "none," so a misclassification is a findable violation
    after the fact."
  - `:51`: "**A reviewer or the owner** may reclassify at any time."
- GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
  - `:52-53`: `"Behavior-preserving" means none of the following changes:` / "a rendered byte, a wire format, a refusal string or an
    exit code;"
  - `:62`: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
    (security), and class-6 pull requests that remove an endpoint."
  - `:64-66`: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;" / "a rule-6
    mutant for each predicate;" / "a non-blocking owner notice in the cycle report."
  - `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- `AGENTS.md` at `7459cc75`:
  - rule 6, `:126-127`: "Mutate the input and confirm the check fails, per predicate, before trusting it";
  - rule 9, `:132`: "A claim of absence needs a sweep with a denominator.";
  - rule 10, `:133`: "Freeze the bytes a review is bound to; any later edit retires the review.";
  - rule 11, `:134-135`: "An evidence record names its subject and the subject's digest; a record that names neither cannot be
    re-checked against the bytes it describes.";
  - the guardrail at `:263-264`: "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it ran at".
- The test-rigor bar, `/home/tze/.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`:
  - `:43`: "**A test is worth keeping only if some plausible bug makes it fail.**"
  - `:79`: "6. **Deterministic or quarantined** — A test that fails intermittently is"
  - `:83`: "7. **A failure names the defect**"

**Ruling: confirmed. The change touches class 1 and class 6. It removes no endpoint and touches no class 2, 3, 4, 5 or 7.**
- The delta does not move the class line. It changes what one class-1 evidence row can kill. The governed-plane row is the
  daemon's write-universe refusal, and it again pins port resolution as it did at base (§3.2).
- Class 6 is unchanged: the argv-surface rows keep their titles and literals.
- `state-dir.system.test.ts` is byte-identical to `f7bbb93a` (the record's `prior` and `head` digests are equal, and the delta does
  not list it), so round 1's class-1 ruling for that row stands.

**GP-Q0's three class-1 checks, at `7459cc75`:**
1. **The differential (`:64`): met, in the stand-in form round 1 set.**
   - No product byte differs, so a differential of any product reader is identical by construction. "Records with altered prose"
     has no object, because no record-reading code changed.
   - The stand-in that carries information is old test against new test over a mutant corpus. I ran P1 and P2 against the base,
     prior and head test files (§3.2):

     | Mutant | Base file `3ec69299` | Prior file `f7bbb93a` | Head file `7459cc75` |
     |---|---|---|---|
     | P1 (default port dropped) | killed | **survives** | killed |
     | P2 (env read before `--port`) | survives | killed | killed |

   - R5 and R9 at base hang and bind 7477 (round 1 `base-R5-hang`, `base-R5`, `base-R9`). At head they fail by timeout (§3.2).
   - So on this corpus the head file kills every mutant the base file kills, and P2 besides.
2. **A rule-6 mutant per predicate (`:65`): met**, with one citation to correct (N5). The predicates and their mutants:

   | Predicate | Mutant | Bytes it ran against | Status |
   |---|---|---|---|
   | the runSync timeout | T2 | `f7bbb93a` | its fragment still occurs once at head |
   | the `SYZYGY_PORT=0` default | T1 | `f7bbb93a` | its fragment is gone at head; see `T1-head-R5` |
   | the `SYZYGY_PORT=0` default | `T1-head-R5` (this review) | head | killed by the 7477 predicate |
   | the throw | T3 | `f7bbb93a` | its fragment still occurs once at head |
   | `skipIf(isRoot)` | S1, S2 | `f7bbb93a` | the file is unchanged since |
   | the governed-plane row's `{}` (new in this delta) | the record's `P1-at-prior` | the prior file | P1 survives without the repair |
   | the governed-plane row's `{}` | `ARG-dropped-P1-head` (this review) | head | only the `{}` dropped: P1 survives |
3. **The owner notice (`:66`): owed at landing.** It is the coordinator's to post on `syzygy-bpyt.10`, as briefed.

**GP-Q0's stop rule (`:95-96`) is not triggered.** No product byte changes, so no gate accepts or refuses anything differently.

## 3. What I ran, and the results

### 3.1 The three fragments, and nothing else

[Observed] `<r>tools/fragments.py` reads the git blobs. It applies round 1's F1 fragments (raw `:333-336`) to `f7bbb93a`'s
`daemon-entry-unchanged.system.test.ts` and diffs the result against `7459cc75`'s (`<r>fragments-result.txt`):
- "fragment 1: old occurs 1 in prior, 1 before apply; new occurs 1 in head; old occurs 0 in head". Fragments 2 and 3 read the same.
- "prior lines 226, head lines 228, patched lines 226".
- The residual diff is the comment and nothing else: `@@ -77 +77,3 @@`. One comment line becomes three, so the comment above
  `RUN_SYNC_TIMEOUT_MS` grows from 3 lines to 5.
- No `it(` title line is in the delta.

### 3.2 P1, P2, R5, R9 and the repair's own predicates

Every vitest run went through `<r>tools/probe.py` (sha256 `aa58085d…`; every record carries it). The probe is adapted from round 1's
tool, with the same watch and kill rules and an expected outcome per case:
- It refuses to start while anything listens on 7477.
- It runs vitest in its own session with a private TMPDIR (a `mkdtemp` directory in `/tmp` named `r525b-`, the case name and a random suffix), which it removes afterwards.
- It samples `ss -ltnpH` with a 0.25 s sleep between samples and walks `/proc` from vitest's PID.
- It SIGKILLs only its own descendants: one listening on 7477, on first sight, and the session at a 240 s deadline.

All 15 records are `<r>run-*.json`. Each records commit `7459cc75`, tree clean after, and `passesExpectation: true`
(`<r>probe-summary.txt`). In every record a source mutant's `old` occurs exactly once, and its build carries the mutant into
`dist`. Mean sample interval: 0.61–0.84 s; load1 was 25–58.

| Case | Edit / environment | Expected | Outcome [Observed] |
|---|---|---|---|
| `head` | none; both files | pass | exit 0, 21 passed; 0 of 16 samples on 7477 |
| `P1-head` | P1: `main.ts` `… ?? env['SYZYGY_PORT'] ?? String(DEFAULT_PORT);` → `… ?? env['SYZYGY_PORT'];` | killed by the governed row only, no timeout | exit 1. Only the governed-plane row fails (288 ms): "AssertionError: expected { status: 1, stdout: '', …(1) } to deeply equal { status: 1, stdout: '', …(1) }" |
| `P2-head` | P2: `env['SYZYGY_PORT'] ?? flags.get('--port') ?? …` | `["--port","70000"]` only, by timeout | exit 1. "Error: ["--port","70000"]: spawnSync /home/tze/.nvm/versions/node/v24.6.0/bin/node ETIMEDOUT (timeout 20000 ms)" (20,040 ms). 0 of 48 on 7477; one listener, port 34633 |
| `P1-prior` | P1, with the test file at `f7bbb93a` | survives | exit 0, 15 passed. **The control reproduces** |
| `P2-prior` | P2, with the test file at `f7bbb93a` | `["--port","70000"]`, by timeout | exit 1, 20,274 ms `ETIMEDOUT`; 0 of 43 on 7477 |
| `P1-base` | P1, with the test file at `3ec69299` | killed by the governed row | exit 1, the governed-plane row only (209 ms) |
| `P2-base` | P2, with the test file at `3ec69299` | survives | exit 0, 15 passed |
| `R5-head` | R5 (8.2 record's edit to `argv.ts`) | 2 rows by timeout | exit 1 in 51.9 s. "Error: ["--port","0","dossier"]: spawnSync … ETIMEDOUT (timeout 20000 ms)" (20,124 ms), and "Error: ["Dossier"]: spawnSync … ETIMEDOUT (timeout 20000 ms)" (20,034 ms). **0 of 63 samples on 7477**; listeners 45265 and 45491; 0 survivors |
| `R9-head` | R9; `tsc -b` exit 2 with the same two type errors the record keeps, and dist carries it | `["--port"]` by timeout | exit 1 in 31.4 s, 20,060 ms `ETIMEDOUT`. 0 of 41 on 7477; one listener; 0 survivors |
| `ARG-dropped-P1-head` | P1, plus the head's `dir, {})).toEqual({` → `dir)).toEqual({` | survives | exit 0, 15 passed. The `{}` alone carries the kill |
| `READS-PORT-default-rows` | the head's default `portEnv` `{ SYZYGY_PORT: '0' }` → `{ SYZYGY_PORT: 'notaport' }` | pass | exit 0, 15 passed. None of the 11 default rows reads `SYZYGY_PORT` on a faithful run |
| `READS-PORT-governed-row` | the governed row's `{}` → `{ SYZYGY_PORT: 'notaport' }` | killed by the governed row | exit 1, that row only (347 ms). It does read the variable |
| `T1-head-R5` | R5, plus the default `portEnv` → `{}` (round 1's T1, in the head's form) | binds 7477, caught | `Dossier` listened on **127.0.0.1:7477** at t = 25.83 s: pid 1436322, argv "/home/tze/.nvm/versions/node/v24.6.0/bin/node <tree>/apps/syzygy/dist/main.js Dossier". The probe SIGKILLed it on that sample. That row then failed in 1,052 ms with "expected { status: null, …(2) }", and `["--port","0","dossier"]` failed by `ETIMEDOUT`. 0 survivors |
| `head-runner-env` | vitest started with `SYZYGY_PORT=notaport`, `SYZYGY_STATE_DIR=/nonexistent-r525b/state` and `SYZYGY_OBSERVED_ROOT=/nonexistent-r525b` exported | pass | exit 0, 15 passed |
| `P1-head-runner-env` | P1, with vitest started with `SYZYGY_PORT=0` exported | killed by the governed row | exit 1, the governed-plane row only (553 ms). A runner's `SYZYGY_PORT` cannot mask P1 |

- **The P1 failure names the defect.** [Observed] `<r>tools/p1_direct.py` runs the governed-plane argv against the built entry with
  every `SYZYGY_` variable removed. It gives (`<r>p1-direct.txt`):
  - faithful: "faithful: exit 1, stdout 0 bytes, stderr line 1: syzygy daemon: state directory <BASE>/root/.syzygy/x lies inside
    the governed plane (<BASE>/root/.syzygy); choose a location outside openspec/ and .syzygy/";
  - under P1: "P1: exit 1, stdout 0 bytes, stderr line 1: syzygy daemon: port must be an integer in [0, 65535]; got `undefined`".

  This is round 1's inferred failure scenario, now observed. The row's `toEqual` diff carries it.
- **7477 after the runs.** [Observed] `ss -ltnpH` showed nothing on 7477 before the first batch, before the second and after the
  last. `pgrep -af` for my clone path matched 0 processes.
- **A superseded first batch.** I first ran 12 of these cases with an earlier version of `probe.py`, which lacked the three
  `READS-PORT`/`T1` cases. They had the same outcomes, but I deleted them, because their tool bytes are not kept (rule 11). The
  15 records above are the re-run with the kept tool.

### 3.3 Does the governed-plane row depend on the runner's environment? No

- [Observed] `daemon-entry-unchanged.system.test.ts:27` at head:
  `const ENV = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('SYZYGY_')));`. `runSync` spawns
  with `env: { ...ENV, ...portEnv }`, so with `portEnv = {}` the row gets no `SYZYGY_` variable, whatever the shell exports.
- [Observed] `apps/syzygy/src/main.ts` at head reads exactly three environment keys: `SYZYGY_OBSERVED_ROOT`, `SYZYGY_PORT` and
  `SYZYGY_STATE_DIR`. A regex sweep over `env['…']` in the file found those 3; `process.env` occurs once, at `:196`
  (`parseCli(process.argv.slice(2), process.env)`). The test strips all three.
- [Observed] `head-runner-env` and `P1-head-runner-env` confirm this by run (§3.2).
- On a faithful run the row is refused in `parseCli` before any bind, so whether 7477 is busy does not matter either.
- **Neither a defect nor a note.**

### 3.4 The comment above `RUN_SYNC_TIMEOUT_MS`: true as stated

The head text, at `:75-79`: "No invocation runSync makes may start a daemon. If one wrongly does, SYZYGY_PORT=0 keeps it off the
default port 7477 and the timeout ends it, so the row fails instead of blocking the worker: spawnSync is synchronous, so the
suite's own timeout cannot fire (syzygy-bpyt.4.22). SIGKILL, because the daemon handles SIGTERM as a graceful shutdown. The
governed-plane row runs without the variable, as captured: it is the one row that reaches port resolution with no --port, so it
pins that the default resolves to a valid port. A regression that wrongly admitted that argv could hold 7477 until the timeout."

- **"the one row that reaches port resolution with no --port"**: [Observed]
  - `READS-PORT-default-rows`: none of the other 11 rows reads `SYZYGY_PORT`.
  - `READS-PORT-governed-row`: the governed row does.
  - `--port 70000` reaches `:99` with the flag (P2 kills it).
- **"pins that the default resolves to a valid port"**: [Observed] P1 is killed at head (`P1-head`, and `p1_direct.py`).
  - The claim is no stronger than the check. The row pins a value that passes `:101-103`, not the value 7477: a default changed to
    7478 would pass the row.
  - [Inferred] That reading is the one the comment states.
- **"could hold 7477 until the timeout"**: [Inferred from `:99` and `DEFAULT_PORT`, and from `T1-head-R5`, where a `runSync` row with
  no `SYZYGY_PORT` and no `--port` bound 127.0.0.1:7477 under a mutant.] "Could" is right: if 7477 is busy, the admitted daemon
  fails to bind and the row fails by diff.
- The SIGKILL and synchronous-`spawnSync` sentences are unchanged from `f7bbb93a`, which round 1 cleared.

### 3.5 The record, against the git objects

[Observed] `<r>tools/check_record.py` reads every byte with `git show`. Result: "129 OK, 0 FAIL, of 129 checks"
(`<r>check-record-result.txt`).
- Rule 6 on my own checker: `--selftest` makes 14 single-field mutations of the record and reports "selftest: 14 of 14 mutants
  killed; control clean: True".
- What the checks establish:
  - **Commit.** `821d807c` resolves and is an ancestor of `7459cc75`. The only path changed between them is the record. So the test
    files the record ran are the reviewed bytes, and the record's `files.*.head` digests hold at both commits.
  - **Base.** `3ec69299` is the merge base with main `a088f1ca`. `priorCommit` `f7bbb93a` is an ancestor of `821d807c`.
  - **Tool digest.** `98ec93ac7916d9bb1109d621663140ba18a42d82578bca3960cdac49ba7bc8ae` holds at `821d807c` and at `7459cc75`.
  - **File digests.** Each file's `base`, `prior` and `head` digest holds at its commit.
  - **8.2 mutant records.** R5's and R9's digests hold, and the stored edits equal those records' edits.
  - **Fragments.** Each mutant's `old` occurs exactly once in its file at the record commit, at `7459cc75`, at base and at
    `f7bbb93a`. That covers R5 and R9 in `argv.ts`, and P1, P2 and P1-at-prior in `main.ts`.
  - **`entryTestAt`.** Each digest equals the test-file blob at its commit (`821d807c`, or `f7bbb93a` for the control).
  - **Outcomes.** For every mutant I recomputed `failedRows`, `timedOutRows`, `slowestFailedRowMs` and the mean interval from its own
    rows.
    - The failed rows are exactly `mustFail`.
    - The failure mode agrees with `mustFailBy`: R5, R9 and P2 all by `ETIMEDOUT`; P1 by none.
    - Exit codes agree: 1 for each kill, 0 for `P1-at-prior`, which has 15 tests, none failed.
    - Every failed row is under 25 s.
    - The 7477 lists, survivors and deadline flags are empty.
  - **Unmutated runs.** `base` and `head` have 21 tests each and pass. `populations` recomputes, with `sameTitlesAndStatuses: True`.
  - **Root shim.** The target row is `skipped`, `passed` and `passed` in its three records. `allPass` recomputes.
  - **`reviewRuns`.** The raw's sha256 equals `77a873ebca6497b7d17c04f5f39c15c71d4c12cbbac3b55b0475bedb01028535`, the round 1 raw's
    own digest. Each of the 8 `outcome` quotes is verbatim on the `rawLine` it names (244, 245, 246, 247, 248, 249, 266, 267), and
    each line names its case.
    - T3's quote joins two verbatim pieces of `:249` with " ... ".
    - S2's case is named `S2-skip-inverted`. Line 267 covers both of round 1's S2 records, `noshim` and `shim`.

### 3.6 The PR body, against the record

[Observed] The body was read with `gh pr view 525 -R Tzeusy/syzygy --json body` (`<r>pr-body-r2.md`, sha256 `251eee9e…`). The
figures were recomputed by `check_record.py`'s figure checks.

| PR-body claim | Record / my run |
|---|---|
| Class line: "CC-REV-1 classes: 1 and 6, by reviewer ruling. Test-only: runSync's environment and failure mode in daemon-entry-unchanged.system.test.ts, and the root skip of state-dir.system.test.ts's mode-000 row. No product byte changed." | **verbatim**: it occurs once in the body and equals the brief's text and round 1's N1 text (raw `:358-360`, joined) by string comparison |
| "a 0.25 s sleep between samples (mean interval 0.42–0.44 s in every mutant run)" | **matches**: the five mutant runs' `meanSampleIntervalSeconds` are 0.42, 0.43, 0.43, 0.43 and 0.44. The unmutated runs are 0.44 and 0.47, and the shim runs 0.42–0.45; the sentence restricts itself to mutant runs. "sampled every 0.25 s" occurs 0 times |
| "In the record's unmutated head run, at load1 15.92–16.33, the slowest `runSync` row took 386 ms (`dossier status <missing>`)" | **matches**: of 12 `runSync` rows in `head`, the slowest is 386 ms, "`dossier status <missing>` is a dossier refusal (exit 1) and starts no daemon". `load1` is `{start: 15.92, end: 16.33}`. The base run's slowest `runSync` row is 259 ms |
| "341 ms" | survives only in the N2 repair note, which says it "had no source in the record and is replaced" |
| R5: exit 1 in 43.9 s; 20,104 and 20,029 ms by `ETIMEDOUT`; 0 of 103; two listeners; 0 survivors | matches |
| R9: 24.1 s; 20,033 ms; 0 of 56; one listener; `tsc -b` exits 2, both type errors kept | matches |
| P1: exit 1 in 3.9 s; governed row 121 ms, no timeout; 0 of 9 | matches |
| P2: exit 1 in 23.9 s; `["--port","70000"]` 20,037 ms `ETIMEDOUT`; 0 of 57; one listener | matches |
| P1 control: exit 0, 15 passed | matches; reproduced (`P1-prior`) |
| "Eleven of its twelve rows use the default" | matches: one call site passes `{}`; `READS-PORT-*` |
| `main.ts:99` is port resolution | matches: `:99` at `7459cc75` is the `portText` line |
| Text pin "base line numbers, now `:213-228`" | matches: base `:203`/`:218` and head `:213`/`:228` are that row's `it(` and closing `});` |
| "The skipped-population pin is a follow-up bead" | [Observed] `bd list --all --json` (825 beads): `syzygy-bpyt.4.30`, in_progress, "Pin the system tier's skipped-test population so an over-broad skip guard fails" |
| Main at `a088f1ca`: 244 paths, none a subject path | matches §1 |
| `npm run test:system` 47 passed, 1 skipped (48); typecheck 0; `check_governance` 32/21/0; `check_quotations` 0 findings | matches my runs (§3.7) |
| Battery `commands=110 nonzero=0` at `7459cc75` | lane-reported; not re-run here |
| Hosted runs green | [Observed] `gh pr checks 525`: "checks	pass	1m18s" and "node	pass	4m16s" |

### 3.7 Gates at `7459cc75`

| Run | Result (verbatim) |
|---|---|
| `npm run typecheck` | exit 0, no output beyond the command line (`<r>typecheck-head.log`) |
| `npm run test:system`, TMPDIR `/tmp/r525b-sys`, load1 about 52–54 | " Test Files  8 passed \| 1 skipped (9)" / "      Tests  47 passed \| 1 skipped (48)", exit 0. The TMPDIR afterwards held only `node-compile-cache` |
| `python3 scripts/check_governance.py` | "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted", exit 0 |
| `python3 scripts/check_quotations.py` | "OK    QC-1  a quotation beside a path:line locator was said by that file — 36 quotations examined in 17 of 940 .md files scanned (loc-paren-quote 2, loc-colon-quote 24, quote-paren-loc 10), 0 findings", exit 0 |
| The 20 s margin | [Observed] Over 15 records, 169 `runSync` rows passed. The slowest took 1,230 ms (`dossier status <missing>`, in `R9-head` at load1 50.3–55.6; `<r>margin-from-records.txt`). [Unknown] Not measured at load 127, as before |

## 4. Round 1's findings

- **F1: repaired.**
  - The three fragments are applied exactly, each once, with only the comment besides (§3.1).
  - P1 is killed at head by the governed-plane row alone. P2 is killed by `ETIMEDOUT`. The P1 control survives at `f7bbb93a`.
  - R5 and R9 fail by `ETIMEDOUT` with nothing on 7477 (§3.2).
  - Titles are unchanged, and the delta stays `+0 ~13 -0`. No product byte changed.
  - The accepted exposure is as stated: a regression admitting the governed argv binds 7477 if it is free, for up to 20 s.
- **N1: repaired.** The PR body's class line is verbatim (§3.6). The GP-Q0 owner notice on `syzygy-bpyt.10` remains the
  coordinator's at landing.
- **N2: repaired.**
  - The sampling sentence reads "0.25 s sleep between samples", with the mean stated, and the mean matches the record.
  - "341 ms" is replaced by 386 ms, which the record carries, with its load1 (§3.6).
  - The record now stores `meanSampleIntervalSeconds` and `load1` for every run: 10 of 10 records carry both.
- **N3: repaired**, with one citation going stale under the F1 repair (N5).
  - `reviewRuns` cites T1–T3, S1, S2, `base-R5-hang`, `base-R5` and `base-R9` by raw line, with verbatim outcomes and the raw's digest
    (§3.5).
  - The skipped-population pin is filed as `syzygy-bpyt.4.30`.
  - The citations resolve only against round 1's raw retained byte-identically, sha256 `77a873eb…01028535`, as the record says.
- **N4:** for syzygy-bpyt.8.35, not this PR. Not assessed.

## 5. New findings

### N5 — The record's T1 citation predates the predicate's head form (low; evidence trail)

- **Evidence.** [Observed]
  - The record's `reviewRuns` cites round 1's `T1-no-port-env-R5` (raw `:247`) for "SYZYGY_PORT=0 on runSync rows". Its `old`
    fragment is `env: { ...ENV, SYZYGY_PORT: '0' }`.
  - That fragment occurs once at `f7bbb93a` and **0 times at `7459cc75`**. `67f2db90` moved the predicate into
    `portEnv: Record<string, string> = { SYZYGY_PORT: '0' }`.
  - The other four cited predicate fragments still occur once at head: T2, T3, S1 and S2.
  - The record discloses that the cited runs "ran against f7bbb93a's test file", so it states nothing false.
  - The head-form mutant is this review's `T1-head-R5`: the default emptied, under R5. `Dossier` bound 127.0.0.1:7477, and the 7477
    predicate caught it (§3.2).
- **Failure scenario.** A later reader assembles GP-Q0 `:65`'s "a rule-6 mutant for each predicate" for the landed bytes. They take
  T1 from the record and try to re-run it at `7459cc75`. The fragment does not apply, so the predicate's head form looks unmutated,
  or the reader re-derives a mutant that binds 7477 on a shared host to find out.
- **Proposed fix.** No byte change. In the disposition and the landing comment, add this sentence: "SYZYGY_PORT=0 default, head
  form: R-GP-IMPL-RUNSYNC-ROOT-SKIP-2 T1-head-R5 (default portEnv emptied, under R5) — Dossier bound 127.0.0.1:7477, caught by the
  7477 predicate; round 1's T1 fragment no longer occurs at 7459cc75." Also cite `ARG-dropped-P1-head` and `READS-PORT-*` as the
  head-form evidence for the governed row's `{}`. Retain `<r>run-T1-head-R5.json` and `<r>tools/probe.py` with this raw, so the
  citation is re-runnable.

No blocking finding. Round 1's tool and the lane's tool are evidence tools outside the product. Their judging logic was re-checked
only where a recorded outcome depends on it (§3.5).

## 6. Every changed output, or the evidence that there is none

- **Product outputs: none changed.** [Observed] The subject touches 4 paths: two `packages/cap1-system/src/*.system.test.ts` files and
  two files under `docs/evidence/syzygy-bpyt-4-22/`. `git diff --stat 3ec69299 7459cc75 -- apps packages/cap1-daemon
  packages/polaris-dossier` is empty, so no rendered byte, wire format, refusal string or exit code of the daemon or the dossier
  family can differ.
- **Test outputs.**
  - The head file's unmutated run gives the same 21 titles and statuses as base (record `populations`, and my `head`: 21 passed).
  - The test tier gives "Tests  47 passed | 1 skipped (48)" at head.
  - What changes is what the file can kill (§2, check 1):
    - P2 is newly killed;
    - P1 is killed as at base (round 1 lost that kill, and the delta restores it);
    - R5 and R9 now fail in about 20 s instead of hanging with a daemon on 7477.
- **The state-dir row** is unchanged since round 1.
- **Evidence outputs.**
  - The record is regenerated at schema 2.
  - Its `head` digests equal the reviewed test files.
  - It adds `priorCommit`, the P1, P2 and P1-at-prior cases, `meanSampleIntervalSeconds`, `load1` and `reviewRuns`. All of these
    checked clean (§3.5).

## 7. Cleanup, and every kept file

- Deleted: the scratch clone `<r>clone`, the TMPDIR `/tmp/r525b-sys`, every probe TMPDIR (`ls -d /tmp/r525b-*` → 0), the
  superseded first batch, my re-derived diffs (their digests are in §1), `npm-ci.log` and the `bd list` output.
- Nothing listened on 7477 after the runs, and no process with my clone's path remained.
- Kept, with sha256:

| File | sha256 |
|---|---|
| `<r>tools/probe.py` | `aa58085d9eb7dbdbfb93b394ab806c9c14d42da14e1102a155fc82f05d98ea67` |
| `<r>tools/run_cases.py` | `36fcf97b83805df85d0fd59178c8725fa331aa98be3bad8c5dbb64ae888965b1` |
| `<r>tools/summarize.py` | `dae2aa421e98a9c88763e8e8ed2c1a02d05b69d839a05f8d62771f4863bf1419` |
| `<r>tools/check_record.py` | `22a2d4a7b5894941ff769322248d9563c41a8b95e3bf5517801f5e1f3ec23e1a` |
| `<r>tools/fragments.py` | `4b298f464c30293e9ff0d946cd6d1eeec1a826303e43207505f10e736c267e5d` |
| `<r>tools/p1_direct.py` | `4715e7acb895e051adb7ead41fd2809400106c2977e27fb496d76ffa21063072` |
| `<r>run-head.json` | `4837f97558703ab474cd0f205471d9e05b52021882991fc499447f6f172ac65d` |
| `<r>run-head-runner-env.json` | `eae98f6a6ede9bc08b1211ce5c1e7a32b46e9a5505abb3b794cbde57c14ebd3c` |
| `<r>run-P1-head.json` | `8d3d97bf2c0b4214cb5a8fc32b4009b1cc139182cb8c8873f0bb5385fc89f1b1` |
| `<r>run-P1-head-runner-env.json` | `2cc8fc4ea3f0b3a88d166295d9f10f93f24367df241870313d0543cabee65d97` |
| `<r>run-P2-head.json` | `e534e1a746e6b76365e22d8eb5aa3c15a7459fa3c1d4dff2f6c3bd4debb7557f` |
| `<r>run-P1-prior.json` | `9617e814ecc7e358d00fce0764c00408db285a81b847ee9ce8dbf52ae6c1bf96` |
| `<r>run-P2-prior.json` | `18398653a5b3f67c31b2d1098f4d013b1c081cd0bd302544a0154ac281c93d20` |
| `<r>run-P1-base.json` | `cf2d64836691e0355dbb44cd91ba20363af5ed0776901b44ee44d76841a07af5` |
| `<r>run-P2-base.json` | `37645db4625d7567b6ea1c48662605e67a8443a9385e4d11d06be5f3ae2120dd` |
| `<r>run-ARG-dropped-P1-head.json` | `387245574e5beb1559aeaad243fdbf845f1b7362b65387c8384ac5e878797251` |
| `<r>run-READS-PORT-default-rows.json` | `fa135afecc35ed6fda02d65d4a4759c87631f67552a8767688773b626631ad75` |
| `<r>run-READS-PORT-governed-row.json` | `213155c270b3e7e2a17d34fb0ec825f8aab0d40f9e3e342c5fb43286f2cb896f` |
| `<r>run-R5-head.json` | `619a642b41b40ab994fd10ee50be12b8000c17dc5a58364412d3afe7e0c80c4f` |
| `<r>run-R9-head.json` | `bce25efa4eb6e4ee805400f3017b7895be2ead8ef6b7140c8c936022c1f9df06` |
| `<r>run-T1-head-R5.json` | `aaad8055b574316977480fd7ea14eefc68a7408007a0cf7215182cf6531a130e` |
| `<r>probe-summary.txt` | `266e2def8b86c84c20a1c72c289cd173bad42540491739181a0f1dd7e03c0d97` |
| `<r>cases.log` | `bde56b7a918c362dd2d476c5e5d7d840be455728773c9537a26c20ac917202be` |
| `<r>check-record-result.txt` | `e759991d3ba87e15562b105e1ca79dc6c3d4eec5b86ccf6f3a75b36a90c1b835` |
| `<r>fragments-result.txt` | `f657697650da8508f75f10f382439d9cab51c9a497dfd04fca7343f9487ffa4a` |
| `<r>p1-direct.txt` | `7881e68e8334395fe6fa5986872dc7ec4d385786e77a7635eb9e0c2ab64446d4` |
| `<r>margin-from-records.txt` | `05ef6ae13efa5e2a8392010ff36544981734870b8483a6ce7a8f2b27d785c95b` |
| `<r>main-since-base.txt` | `2e72ed16495b16e95f3a7f61aaa26fe8c2e81bf1260d58a4439a07e20dd0d8ed` |
| `<r>pr-body-r2.md` | `251eee9e6058366e91afbd942393c5ccfaff173187c553915476096a69aea971` |
| `<r>typecheck-head.log` | `e2c8b37ba8c2974699631485e9c24406b9eb7c793bbbd178345cd4a0f86ce13f` |
| `<r>test-system-head.log` | `0eacaeb2c49376d5b8b84a3f2a6273d4434feaeea2bf605276ae7e650218b79a` |
| `<r>check-governance-head.log` | `f9ea0a6223707a32e2e1023e238c3f0691033880b157e994bf988f906e724b63` |
| `<r>check-quotations-head.log` | `7b0cd36d8aed015d576743c255ab4f7728ee1c147f3b685de18d042f2d970c48` |
| `<r>build-head.log` | `598506fd1002083a8b8895ef5213fdd81296d012d6258a5a48b043ba4543ce93` |

This raw itself is `<r>R-GP-IMPL-RUNSYNC-ROOT-SKIP-2-RAW.md`; its digest is in the reply.
