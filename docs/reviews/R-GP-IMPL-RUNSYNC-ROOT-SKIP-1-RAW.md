# R-GP-IMPL-RUNSYNC-ROOT-SKIP-1 — CC-REV-1 implementation review of syzygy-bpyt.4.22 and syzygy-bpyt.4.25, round 1
Verdict: REVISE
Reviewed commit: f7bbb93a
Subject: r1-review.diff sha256 c780b020a574d0edb253ed77367df21e4ff415c71420f59a3b5590362c126087

Reviewer: rev-525, an independent fresh-context reviewer (Claude Opus 5.5), 2026-10-25. I did not author the change and did not
share its session. No observed-repository content was fetched or read. No credential file was opened. No bd mutation, push, PR
comment or merge was made, and no worktree under `/home/tze/GitHub/syzygy/.worktrees/` was touched.
Environment: Node v24.6.0, a scratch clone of `/home/tze/GitHub/syzygy` at `f7bbb93a` with `npm ci` and `npm run build`, 12 cores,
load1 between about 15 and 76 while I ran. In paths below, `<r>` stands for
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-525/`. In quoted process argv, `<tree>`
is the probe's own mask for that clone's path, as stored in its records.

**Summary.**
- The timeout, SIGKILL and throw do what syzygy-bpyt.4.22 asks.
  - Under R5 and R9 the file now fails in about 20 s per wrongly admitted row, with nothing on 7477 and no survivor.
  - At base the same mutants hang the file and bind 127.0.0.1:7477. I reproduced that here.
- The root skip is limited to its one row and uses the repository's idiom.
- But `SYZYGY_PORT=0` on every `runSync` row changes the faithful path of one row, the governed-plane refusal.
  - That row reaches port resolution without `--port`: `apps/syzygy/src/main.ts:99` runs before the governed-plane check at
    `:105-118`.
  - So at base the row also pins, as a side effect, that the default port resolves to a valid port.
  - A product mutant that drops the default (P1) is killed at base by that row alone. At head it survives the file and the whole
    system tier (47 passed, 1 skipped).
  - That is an environment change that masks a regression in what the daemon entry admits. The verdict is REVISE (F1).
- A repair to that one row, tried in my scratch clone, restores the kill and leaves every other result as it was.

**Findings, one line each:**
- **F1** (blocking, medium): `SYZYGY_PORT=0` masks a dropped or invalid default port. The governed-plane row is the only row that
  pinned it; P1 is killed at base and survives at head, in the file and in the system tier.
- **N1** (low, process): I rule the change class 1 and class 6 (no endpoint removed). GP-Q0's owner notice is owed at landing, and
  the PR's "none" should be corrected in the disposition.
- **N2** (low): two PR-body figures are not in the record: "341 ms" and "sampled every 0.25 s" (the mean is 0.41 s).
- **N3** (low): the lane's record has no mutant of the change's own predicates and no base-side mutant run; this review supplies
  them. The throw is diagnostic only, and a skip guard that skips too often fails no exit code.
- **N4** (low, method for syzygy-bpyt.8.35): the getuid shim reaches the daemon too, and `-t` makes filtered rows read "skipped".
  For the next root skip, shim only the test worker and run the file unfiltered.

## 1. Subject identity checks

All [Observed], by script, in my clone (`<r>clone`, deleted at the end).

| Check | Result |
|---|---|
| Brief's subject file digest | `sha256sum …/lead/b422/r1-review.diff` → `c780b020a574d0edb253ed77367df21e4ff415c71420f59a3b5590362c126087`. **Matches.** |
| Re-derived diff | `git diff 3ec6929951080613b3c5cb7205fe303c5449be58 f7bbb93a005b45c2866d8a9993afbca44cd1a34f --output=<r>rederived.diff` → sha256 `c780b020a574d0edb253ed77367df21e4ff415c71420f59a3b5590362c126087`. **Matches**, byte for byte. |
| Branch head | `git ls-remote https://github.com/Tzeusy/syzygy refs/heads/agent/syzygy-bpyt.4.22` → `f7bbb93a005b45c2866d8a9993afbca44cd1a34f` |
| Base | `git merge-base f7bbb93a 71334012548cccd46a5a95e313a6014da87c8e3c` → `3ec6929951080613b3c5cb7205fe303c5449be58`. Main at `71334012` is "Merge pull request #523 from Tzeusy/agent/syzygy-bpyt.8.33". |
| Size | `--numstat`: 753/0 `runsync-and-root-probe.json`, 191/0 `tools/runsync_and_root_probe.py`, 9/1 `daemon-entry-unchanged.system.test.ts`, 3/1 `state-dir.system.test.ts`. 4 files, **+956/−2**, as briefed. |
| Commits | 4 in `3ec69299..f7bbb93a`: `dcb1b251` (runSync), `56a4c81a` (root skip), `be2b2dc6` (evidence tool), `f7bbb93a` (record). |
| Main since base | `git diff --name-only 3ec69299 71334012`: 58 paths. None is a subject path. None lies under `packages/cap1-system/`, `apps/syzygy/` or `docs/evidence/syzygy-bpyt-4-22/`, and none is `packages/polaris-dossier/src/argv.ts`. (Main did change `packages/polaris-dossier/src/launched.test.ts`, which is not a subject.) |
| Product bytes | None changed. The two code files are tests in `packages/cap1-system`, a test-only package; the rest is new evidence. |

## 2. Clauses relied on (quoted), and the class ruling

Quoted at `f7bbb93a`.

- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
  - `:31-32`: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
  - `:37`: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
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
- `AGENTS.md`:
  - rule 6, `:126-127`: "Mutate the input and confirm the check fails, per predicate, before trusting it";
  - rule 9, `:132`: "A claim of absence needs a sweep with a denominator.";
  - rule 11, `:134-135`: "An evidence record names its subject and the subject's digest; a record that names neither cannot be
    re-checked against the bytes it describes.";
  - the guardrail at `:263-265`: "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it ran at".
- The test-rigor bar, `/home/tze/.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`:
  - `:43`: "**A test is worth keeping only if some plausible bug makes it fail.**"
  - `:79-80`: "6. **Deterministic or quarantined** — A test that fails intermittently is worse than no test"
  - `:83`: "7. **A failure names the defect**"
- Prior rulings this one follows:
  - `docs/reviews/R-GP-IMPL-DOSSIER-CLI-TABLE-1-RAW.md:55` (PR #518): "**Ruling: the PR touches class 1 and class 6.**" The
    `governedPlaneViolation` swap was class 1, and "The `syzygy` / `syzygy dossier` / `syzygy polaris` argv surface" (`:79`)
    was class 6.
  - `docs/reviews/R-GP-IMPL-LAUNCH-FORM-CTIME-1-RAW.md:56-58` (PR #519), on `launched.test.ts`: "A change that weakens or
    strengthens what these rows can kill changes the security evidence, even though it changes no product byte."

**Ruling: the change touches class 1 and class 6. It touches no endpoint removal and no class 2, 3, 4, 5 or 7.**

- **`daemon-entry-unchanged.system.test.ts`: classes 1 and 6.**
  - Its rows are the entry-level evidence for PR #518's two classes.
    - The governed-plane row is the daemon's write-universe refusal (class 1).
    - The usage and refusal rows pin the argv surface (class 6).
  - The change alters what those rows can kill. Under the #519 principle above, that touches the classes they are evidence for,
    even though no product byte changes.
  - This is not a formality. It weakens one kill (P1, F1) and strengthens another (P2, §3.4).
  - Class 6: no endpoint is removed, so GP-Q0 adds no check for it.
- **`state-dir.system.test.ts`: class 1.**
  - The skipped row sits in "RTF-1 — state-dir governed-plane check resolves symlink reality". It is the evidence that an
    unreadable state-directory component fails closed before any write.
  - The skip removes that evidence only for a root runner. On every runner that exists today, nothing changes (§3.5).
  - [Inferred] The hosted CI runner is not root, so no current run changes.
- **Class 4: not touched.** No SEC surface, auth check, credential path or egress path changes.
- **The PR's declaration** ("My guess is none") left the ruling to the reviewer, which `:49-51` permits. The disposition should
  record "classes 1 and 6" (N1).

**GP-Q0's three class-1 checks:**
1. **The differential (`:64`): degenerate for product code, informative for the tests.**
   - No product byte differs, so an old-versus-new differential of any product reader is identical by construction.
   - "Records with altered prose" has no object: no record-reading code changed.
   - The stand-in that carries information is old test against new test over a mutant corpus. I ran R5, R9, P1 and P2 against
     both the base file and the head file (§3.4).
   - That stand-in is **not** neutral: it is where F1 appears.
2. **A rule-6 mutant per predicate (`:65`): supplied by this review.**
   - The change adds four predicates:
     - the `runSync` timeout;
     - `SYZYGY_PORT=0`;
     - the throw on `result.error`;
     - `skipIf(isRoot)`.
   - The lane's record runs R5 and R9 against the new code but mutates none of these four (N3).
   - T1, T2, T3, S1 and S2 do (§3.4, §3.5).
3. **The owner notice (`:66`): owed.** The coordinator posts it at landing (N1).

**GP-Q0's stop rule (`:95-96`) is not triggered.** No product byte changes, so no gate accepts or refuses anything differently.
What changes is what a test can see, which F1 covers.

## 3. What I ran, and the results

Every vitest run went through `<r>tools/probe.py`, which does the following:
- It runs vitest in its own session, with a private TMPDIR (a `mkdtemp` directory in `/tmp` whose name starts `r525-` and the
  case name) that it removes afterwards.
- It samples `ss -ltnpH` and walks `/proc` from vitest's PID.
- It kills only processes it saw descend from its own vitest:
  - a daemon listening on 7477, on the first sample that shows it;
  - a daemon older than 30 s, only in the base-side mutant cases other than `base-R5-hang`, to get past a hang;
  - the whole session, at a deadline.
- It writes each touched file back, rebuilds after a source mutant, and records the edits as `old`/`new` fragments with their
  occurrence counts.
- `<r>tools/run_cases.py` refuses to start a case while anything listens on 7477.

All 30 records are `<r>run-*.json`, one per case name (listed in §8). Each records commit `f7bbb93a` and probe sha256
`0d82288a92a49bfe8af739ee1f15a61ed3b208b672b07e4c85cb2d18b076cfa6` (`<r>probe-summary.txt`: every row "tool =").
Every record has `treeCleanAfter: true` and 0 survivors.

### 3.1 Unmutated runs, gates

| Run | Result (verbatim where quoted) |
|---|---|
| `head`: both files at head | exit 0, 21 passed, 0 on 7477, 0 survivors |
| `base`: both files as at `3ec69299` | exit 0, 21 passed. Titles and statuses equal head's: 21 = 21, list equality `True` |
| `npm run test:system` at head (TMPDIR `/tmp/r525-sys`) | " Test Files  8 passed \| 1 skipped (9)" / "      Tests  47 passed \| 1 skipped (48)", exit 0. TMPDIR afterwards held only `node-compile-cache` |
| `npm run typecheck` | exit 0, no output beyond the command line |
| `python3 scripts/check_governance.py` | "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted", exit 0 |
| `python3 scripts/check_quotations.py` | "OK    QC-1  a quotation beside a path:line locator was said by that file — 36 quotations examined in 17 of 940 .md files scanned (loc-paren-quote 2, loc-colon-quote 24, quote-paren-loc 10), 0 findings", exit 0 |
| `COUNT-runSync-rows`: `runSync` throws on entry | `{'failed': 12, 'passed': 3}`. Exactly 12 rows call `runSync`: 3 usage, 5 refusals, 1 governed-plane and 3 `dossier`. The 3 that pass are the two `runDaemon` rows and the static import row |

### 3.2 Can the new environment mask a regression? Yes, at one row (F1)

- **Where the port is read.** [Observed, `apps/syzygy/src/main.ts` at `f7bbb93a`]
  - `:99`: `const portText = flags.get('--port') ?? env['SYZYGY_PORT'] ?? String(DEFAULT_PORT);`
  - `:101-103` refuses an invalid port.
  - Only then, at `:105-118`, comes the lexical governed-plane check. `main()` applies the symlink-reality check after parsing
    (`:196-205`).
  - `SYZYGY_PORT` appears in no other source file: `grep -rl SYZYGY_PORT` over `packages`, `apps` and `scripts` hits only this file
    and the test.
- **Which `runSync` rows read it on a faithful run.**
  - `--help`, `-h` and `--help dossier` stop before parsing.
  - `--bogus`, `--port 0 dossier`, `Dossier` and `--port` fault in `readArgv`.
  - `--port 70000` carries the flag.
  - The three `dossier` rows never reach `parseCli`.
  - **The governed-plane row**, `['--root', root, '--state-dir', root/.syzygy/x]`, is the only one that reaches `:99` with no
    `--port`. At base its `portText` is `'7477'`; at head it is `'0'`.
  - The PR body's residual "[Inferred] None of these rows reads the port, because none of them should start a daemon" is
    therefore wrong for this row.
- **Do expected literals depend on it?** Not on a faithful run.
  - USAGE is static text. The `--port 70000` detail comes from the flag. The governed-plane detail names no port.
  - That is why the literals captured at `55daf6ce` still pass.
- **The mutants that settle it** (records `run-P1-*`, `run-P2-*`):

| Mutant (in `apps/syzygy/src/main.ts:99`, old occurs once, build exit 0, dist carries it) | Base test file | Head test file |
|---|---|---|
| **P1** drops the default: `… ?? env['SYZYGY_PORT'];` | **killed**, 1 failed of 15: the governed-plane row, "AssertionError: expected { status: 1, stdout: '', …(1) } to deeply equal { status: 1, stdout: '', …(1) }" at `daemon-entry-unchanged.system.test.ts:126:92` | **survives**: 15 passed, exit 0 |
| P1 across the whole system tier | `P1-default-dropped-system-base`: `{'failed': 1, 'passed': 46, 'skipped': 1}`, the one failure being the governed-plane row | `P1-default-dropped-system-head`: `{'passed': 47, 'skipped': 1}`, exit 0 |
| **P2** env before flag: `env['SYZYGY_PORT'] ?? flags.get('--port') ?? …` | **survives**: 15 passed | **killed**: `["--port","70000"]` fails by `ETIMEDOUT` at 20,036 ms. A daemon started on an ephemeral port; 0 of 57 samples on 7477 |

- **Beyond the system tier.**
  - [Observed] `<r>tools/entry_sweep.py` covers 252 tracked `*.test.{ts,mjs,js}` files plus `harness.ts` at `f7bbb93a`.
  - The files that reach `apps/syzygy` main either pass `--port`: the harness `startDaemon` and every `state-dir` row.
  - Or they only read `main.ts` as text: `subpath-imports.test.ts` and `island-boundary.test.ts`.
  - Or they define their own in-process `startDaemon`: `server.test.ts`, `routes-human.test.ts` and `materialize-action.test.ts`.
  - [Inferred] So no other test in the repository executes the default fallback. I did not run the unit tier under P1.
- **So the environment both gains and loses a kill.**
  - It gains P2.
  - It loses P1: the documented invocation `node apps/syzygy/dist/main.js` would refuse instead of serving on 7477, and nothing
    would fail (F1).

### 3.3 The timeout and the throw

- **Is 20 s enough? Yes, at the loads I could reach.** [Observed]
  - `<r>tools/load_margin.py` ran 32 copies of the head file at once.
  - Result: exit codes all 0, 384 `runSync` rows, 0 failed.
  - Slowest row: `["--help"] prints the usage and exits 0` at 4,382 ms. load1 peaked at 75.75.
  - That is a 4.6× margin. The 8-copy run peaked at load1 21.86 with a slowest row of 1,168 ms.
  - [Unknown] Not measured at load 127.
- **Does the throw change a faithful outcome? No.**
  - [Inferred] `result.error` is set only on a spawn failure, a timeout or a `maxBuffer` overflow. Faithful outputs are a few
    hundred bytes.
  - [Observed] On every faithful run here no row failed: head, FIX-head, `test:system`, and the 384 load rows.
  - T3 removes the throw (§3.4). The timed-out rows still fail, as "expected { status: null, …(2) } to deeply equal { status: 1,
    stdout: '', …(1) }".
  - So the throw changes only the message. It names the argv and `ETIMEDOUT`, which meets bar 7.
- **Does SIGKILL leave children? Not on the daemon path.**
  - [Observed] `child_process` appears in no non-test source under `apps/syzygy/src`, `packages/cap1-daemon/src` or
    `packages/cap1-core/src`, nor in `polaris-dossier/src/argv.ts` or `state-directory.ts`.
  - It appears only in `polaris.ts`, `session-view.ts` and two testkits, which only the `polaris` command reaches.
  - Survivors were 0 in all 30 records.
  - [Observed] `<r>tools/spawnsync_grandchild.mjs` shows Node's behaviour when the child does have a child: "B grandchild holds
    pipes: elapsed 2006 ms, error ETIMEDOUT, signal SIGKILL, grandchild 719404 alive after: true sleep 12".
    - So `spawnSync` still returns at its timeout.
    - But a grandchild would outlive the row.
    - [Inferred] No `runSync` row reaches a path that spawns.
- **Does SIGKILL leave a state directory? No, once the row fails.** [Observed]
  - Every `runSync` row's daemon state lies inside the row's temp base: cwd is the base, and the default state dir is
    `<cwd>/.syzygy-daemon-state`.
  - `afterEach` removes the base after the throw.
  - The head runs that timed out (head-R5, head-R9, T1, T3, P2-head, FIX-P2, FIX-R5, FIX-R9) left no `syz-entry-*` in their TMPDIR.
  - The two runs killed at my deadline left one each: `base-R5-hang` (`syz-entry-Kv3Utj`) and `T2` (`syz-entry-HaAxkG`). That is
    the old failure mode.
- **Can a timed-out row leave a process running?** [Observed] Not with the daemon: it is the direct child, and `killSignal:
  'SIGKILL'` ends it.

### 3.4 Mutants, at base and at head

R5 and R9 come from `docs/evidence/syzygy-bpyt-8-2/mutants/` (`old` occurs once in `packages/polaris-dossier/src/argv.ts`). T1,
T2 and T3 are edits to the head test file. P1 and P2 are in §3.2. Port 7477 was free before every case.

| Case | Edit | Outcome |
|---|---|---|
| `head-R5` | R5 | exit 1 in 43.9 s. `["--port","0","dossier"]` and `["Dossier"]` fail by `ETIMEDOUT` at 20,034 and 20,043 ms: "Error: ["--port","0","dossier"]: spawnSync /home/tze/.nvm/versions/node/v24.6.0/bin/node ETIMEDOUT (timeout 20000 ms)". 0 of 105 samples on 7477, 2 ephemeral listeners, 0 survivors |
| `head-R9` | R9; `tsc -b` exit 2 with the two type errors the lane records, dist carries it | exit 1 in 24.5 s. `["--port"]` fails by `ETIMEDOUT` at 20,050 ms. 0 of 57 samples on 7477, 0 survivors |
| `base-R5-hang` | R5, base test file, no unsticking | **hangs**: SIGKILLed at my 120 s deadline (exit −9), no report. One ephemeral listener (the `--port 0 dossier` row); 0 on 7477 because the `Dossier` row is never reached |
| `base-R5` | R5, base test file, a daemon older than 30 s killed | The `--port 0 dossier` row hung until I killed its daemon at 30.0 s (row 30,475 ms). Then **`Dossier` bound 127.0.0.1:7477**: pid 578293, argv `node <tree>/apps/syzygy/dist/main.js Dossier`, killed on the first sample that saw it (t = 32.82 s). Both rows then fail as "expected { status: null, …". So the hang, and the 7477 binding by `Dossier` that PR #518's reviewer reported, both reproduce |
| `base-R9` | R9, base test file | **`--port` bound 127.0.0.1:7477**: pid 581353, argv `… main.js --port`, killed on the first sample (t = 2.4 s) |
| `T1-no-port-env-R5` | R5 + `env: { ...ENV, SYZYGY_PORT: '0' }` → `env: ENV` | **killed by the 7477 predicate**: `Dossier` bound 127.0.0.1:7477, killed on the first sample (t = 22.56 s). Vitest alone cannot see this: the row fails either way |
| `T2-no-timeout-R5` | R5 + timeout and killSignal removed | **killed by the hang predicate**: SIGKILLed at my 90 s deadline, no report |
| `T3-no-throw-R5` | R5 + `if (result.error)` → `if (false)` | **equivalent for pass/fail**: the same 2 rows fail at 20,037 and 20,031 ms, but with "AssertionError: expected { status: null, …" and no `ETIMEDOUT`. Only the lane's `timedOutRows` predicate kills it. (`tsc -b` exit 2 on the test file; vitest runs the source.) |

### 3.5 The root skip

- **The idiom.** [Observed] The row is the same as `packages/polaris-dossier/src/state-directory.test.ts:19` and
  `credential-probe.test.ts:20`: `const isRoot = process.getuid?.() === 0;` and `it.skipIf(isRoot)(…)`, with a one-line comment.
- **Limited to one row?** Yes, two ways. [Observed]
  - In the source, the file has one `skipIf`: `mode-sweep-head.txt`, `state-dir.system.test.ts:358`.
  - In a run, I used a shim that reports uid 0 in every node process except the daemon entry, and ran the **whole** file:
    - `shim-file-head` gives `{'passed': 5, 'skipped': 1}`, and the skipped title is the target row;
    - `shim-file-base` gives `{'passed': 6}`.
- **The lane's filtered form, reproduced.** [Observed]
  - `shim-row-head` gives 6 skipped.
  - `shim-row-base` gives the target passed and 5 filtered.
  - `noshim-row-head` gives the target passed and 5 filtered.
  - These match the record's `root-shim`, `root-shim-base` and `root-control`.
- **Mutants of the skip predicate.** [Observed] Both are killed only by comparing counts. Both give vitest exit 0:
  - S1, `skipIf(true)` as the real user: `{'passed': 5, 'skipped': 1}`;
  - S2, `getuid?.() !== 0`: as the real user `{'passed': 5, 'skipped': 1}`, under the shim `{'passed': 6}`.
- **This checks the condition only.** Both the lane's shim and mine change what `process.getuid()` returns. Neither makes the
  process root, so chmod 000 still blocks it. [Inferred] What the row does under a real root, which can search a mode-000
  directory so that no EACCES arises, stays unobserved until a root job exists.
- **Any other mode-000 row in `packages/cap1-system/`? No.** Rule 9's denominator is the 14 tracked files at `f7bbb93a`.
  - [Observed] `<r>tools/mode_sweep.py` reads the git blobs and finds `totals (lines) {'chmod': 2, 'mode000': 1, 'skip': 3}`. The
    one mode-000 line is `state-dir.system.test.ts:366`, `chmodSync(blocked, 0o000);`.
  - [Observed] A second method, `git grep -n -E "0o[0-7]{3}|mode:" f7bbb93a -- packages/cap1-system`, gives 6 lines, and only `:366`
    is `0o000`.
  - At base the same sweep finds the line at `:364`, unguarded.

### 3.6 The record, against the git objects

`<r>tools/check_record.py` reads every byte with `git show`. Result: "48 OK, 0 FAIL, of 48 checks"
(`<r>check-record-result.txt`).
- Rule 6, applied to my own checker: `<r>tools/selftest.py` makes 12 single-field mutations of the record. It reports "12 of 12
  mutants killed; control clean: True" (`<r>check-record-selftest.txt`).
- What the 48 checks establish, all [Observed]:
  - **Commit.** `be2b2dc6` resolves and is an ancestor of `f7bbb93a`. The only file changed between them is the record itself.
  - **Base.** `3ec69299` is the merge base with main `71334012`.
  - **Tool digest.** The tool's sha256 `30097a29bcf4…` holds at `be2b2dc6` and at `f7bbb93a`.
  - **File digests.** Both test files' base digests hold at `3ec69299`. Their head digests hold at `be2b2dc6` and at `f7bbb93a`.
  - **Mutant records.** R5's and R9's 8.2 mutant-record digests hold, and the stored edits equal those records' edits.
  - **Fragments.** Each `old` occurs exactly once in `argv.ts` at the record commit, at the reviewed commit and at base.
  - **Outcomes.** Each mutant's `failedRows`, `timedOutRows`, exit code, durations under 25 s, empty 7477 list and empty
    survivors were recomputed from its own rows.
  - **Totals.** The populations and `allPass` were recomputed.
- **PR-body claims against the record:**

| PR-body claim | Record / my run |
|---|---|
| R5: exit 1 in 43.7 s; `["--port","0","dossier"]` 20,034 ms, `["Dossier"]` 20,030 ms, both `ETIMEDOUT` | matches |
| R5: 0 of 107 samples on 7477; two ephemeral listeners; 0 survivors | matches (`38677`, `46629`) |
| R9: `tsc -b` exits 2, both type errors kept; exit 1 in 23.7 s; `["--port"]` 20,035 ms; 0 of 56; one listener; 0 survivors | matches |
| 21 tests at base and at head, same titles and statuses | matches; my run too |
| `npm run test:system`: 8 files passed, 1 skipped; 47 passed, 1 skipped | matches my run |
| Root shim: skipped at head, passed at base, passed without the shim | matches; my run too |
| `Tests: +0 ~13 -0`: 12 `runSync` rows + 1 skip row | matches (`COUNT-runSync-rows`: 12) |
| "sampled every 0.25 s" | **not exact**: the mean interval is 0.41 s (R5, 107 samples in 43.7 s) and 0.42 s (R9). The 0.25 s is the sleep between samples (N2) |
| "at load1 about 20, the slowest `runSync` row took 341 ms" | **not in the record**: the record's slowest `runSync` row is 249 ms at head and 230 ms at base, and it stores no load average (N2) |
| "None of these rows reads the port" | **wrong for the governed-plane row** (§3.2, F1) |
| typecheck exit 0; `check_governance` 32/21/0; `check_quotations` 0 findings | matches my runs |
| Battery `commands=110 nonzero=0` | lane-reported; not re-run here |

## 4. Findings

### F1 — `SYZYGY_PORT=0` on every `runSync` row masks a dropped or invalid default port (blocking, medium)

- **Evidence.**
  - [Observed] `main.ts:99` resolves the port before the governed-plane check at `:105-118`.
  - The governed-plane row is the one `runSync` row that reaches `:99` without `--port` (§3.2).
  - At base it ran with no `SYZYGY_` variable, as captured at `55daf6ce`, so it also pinned that the default port resolves to a
    valid port.
  - At head it runs with `SYZYGY_PORT: '0'` and no longer can.
  - P1 (`?? String(DEFAULT_PORT)` dropped) is killed at base by that row alone. It survives at head, in the file (15 passed) and in
    the whole system tier (`{'passed': 47, 'skipped': 1}`).
  - [Inferred, from 252 tracked test files] No other test executes the fallback.
- **Failure scenario.** A later parity refactor of `parseCli` drops or mistypes the fallback; PR #518 already rewrote this
  entry's argv reader.
  - [Inferred from `:99-103`] `node apps/syzygy/dist/main.js` with no `--port` and no `SYZYGY_PORT`, the documented invocation
    whose usage still says "default: 7477", then exits 1: "port must be an integer in [0, 65535]; got `undefined`".
  - That is a change to what the daemon entry admits, and to a refusal string and an exit code (GP-Q0 `:52-53`).
  - The suite stays green, and the PR merges.
- **Proposed fix (tried in my scratch clone).**
  - Run that one row as captured, with no `SYZYGY_PORT`, and keep `SYZYGY_PORT=0` on the other 11. The edits, as `old` → `new`
    fragments of `daemon-entry-unchanged.system.test.ts`, each occurring once:
    1. `function runSync(args: readonly string[], cwd: string): {` →
       `function runSync(args: readonly string[], cwd: string, portEnv: Record<string, string> = { SYZYGY_PORT: '0' }): {`
    2. `env: { ...ENV, SYZYGY_PORT: '0' }` → `env: { ...ENV, ...portEnv }`
    3. `path.join(root, '.syzygy', 'x')], dir)).toEqual({` → `path.join(root, '.syzygy', 'x')], dir, {})).toEqual({`
  - Also update the comment above `RUN_SYNC_TIMEOUT_MS`. It should say that the governed-plane row runs without the variable
    because it reaches port resolution, and that the row pins the default.
  - [Observed] Results with the fix:
    - `FIX-head`: 21 passed.
    - `FIX-P1`: killed by the governed-plane row.
    - `FIX-P2`: killed by `["--port","70000"]` by `ETIMEDOUT`.
    - `FIX-R5` and `FIX-R9`: as at head, by `ETIMEDOUT`, with 0 samples on 7477.
  - Titles are unchanged, and the delta stays `+0 ~13 -0`.
  - [Inferred] The cost: a regression that wrongly admits the governed-plane argv binds 7477, if it is free, for up to 20 s
    before SIGKILL. Any row that pins the default has this exposure, because it must reach port resolution.
  - If that exposure is unacceptable, the alternative is to accept the lost kill and record it. That is the coordinator's call,
    and it would go to the owner if it is taken as a weakened gate check.

### N1 — Record the ruled classes; GP-Q0's owner notice is owed (low; process)

- **Evidence.** The PR says "My guess is none". Section 2 rules class 1 and class 6 for `daemon-entry-unchanged.system.test.ts`
  and class 1 for the `state-dir.system.test.ts` row. No endpoint is removed.
  - GP-Q0 `:66` requires "a non-blocking owner notice in the cycle report" for class 1.
  - Bead 4.25's AC3 asks for "class stated". Its coordinator comment says "no CC-REV-1 class unless the review rules otherwise".
- **Failure scenario.** The PR lands with "none" in its record, and the cycle report (`syzygy-bpyt.10`) has no notice for a
  class-1 change. The owner's notice trail then has a gap.
- **Proposed fix.** Write this line into the disposition and the landing comment: "CC-REV-1 classes: 1 and 6, by reviewer
  ruling. Test-only: runSync's environment and failure mode in daemon-entry-unchanged.system.test.ts, and the root skip of
  state-dir.system.test.ts's mode-000 row. No product byte changed." Then post the GP-Q0 notice on `syzygy-bpyt.10` at landing.

### N2 — Two PR-body figures are not in the record (low)

- **Evidence.** [Observed, `check-record-result.txt`]
  - The PR says the record "sampled every 0.25 s". The record's own `samples` and `wallSeconds` give a mean interval of 0.41 s
    for R5 and 0.42 s for R9. The tool sleeps 0.25 s plus the time each `/proc` walk and `ss` call takes.
  - The PR says "In the unmutated run at load1 about 20, the slowest runSync row took 341 ms". The record's slowest `runSync` row
    is 249 ms at head and 230 ms at base. The record stores no load average: "record mentions '341': False".
- **Failure scenario.** A later reader re-checks the PR against its record (rule 11) and finds a figure with no source. Neither
  figure changes an outcome, because a wrongly admitted daemon lives about 20 s, far longer than one sample interval.
- **Proposed fix.** In the disposition, give the sampling as "0.25 s sleep between samples, mean 0.41 s". Either name where the
  341 ms came from or replace it with the record's 249 ms. Optionally, the tool could record `/proc/loadavg` and the actual
  interval.

### N3 — The change's own predicates have no mutant in the lane's record (low)

- **Evidence.** The record mutates the code under test (R5, R9) and the skip's condition (the shim). It mutates none of the four
  test predicates. It also does not re-run the base file under R5 or R9, which the PR discloses as a residual.
  - [Observed] This review supplies those runs (§3.4, §3.5): T1, T2, T3, S1, S2, `base-R5`, `base-R5-hang` and `base-R9`.
  - Two results are worth recording:
    - (a) **The throw is diagnostic only.** Every `runSync` row asserts `status`, so a timed-out row fails without the throw (T3).
    - (b) **A skip guard that skips too often fails no exit code.** S1 gives `{'passed': 5, 'skipped': 1}` with exit 0.
      [Inferred, not run] The system tier would then read "46 passed | 2 skipped (48)", also with exit 0.
- **Failure scenario.** A later edit inverts or widens `isRoot` or a similar guard. Every gate stays green, and only a reader
  comparing counts notices.
- **Proposed fix.** In the disposition, cite this review's records as GP-Q0's per-predicate evidence. For a follow-up bead:
  pin the system tier's skipped population, as the non-root user, to exactly the `fresh-clone.system.test.ts` row when
  `SYZYGY_FRESH_CLONE` is unset, for example in the battery. A guard that skips too often would then fail something.

### N4 — For the next root skip (syzygy-bpyt.8.35), shim only the test worker and run unfiltered (low; method)

- **Evidence.** [Observed]
  - The lane's shim, `NODE_OPTIONS=--import=…getuid-zero.mjs` with `process.getuid = () => 0`, reaches every node process the
    test spawns, the daemon included.
  - The daemon reads `process.getuid?.()` for its credential owner check (`packages/cap1-daemon/src/credentials.ts:303`).
  - With `-t`, Vitest's JSON reporter marks the filtered-out rows "skipped", which is also the status of a guarded skip.
  - So the record's `root-shim` (6 of 6 "skipped") cannot by itself tell the guard from a filter miss. Its two controls resolve
    that here.
- **Failure scenario.** For `launched.test.ts`, a shim that reaches the code under test changes its behaviour too, and a filtered
  run can read as the skip working when the filter simply missed.
- **Proposed fix.** Use a shim that leaves the subject process alone. Mine is:

  `if (!(process.argv[1] ?? '').endsWith('apps/syzygy/dist/main.js')) process.getuid = () => 0;`

  Run the whole file, and compare per-title statuses with and without the shim. Here that gives `shim-file-head` 5 passed and
  1 skipped (the target), and `shim-file-base` 6 passed.

## 5. Every changed output, or the evidence that there is none

- **Product outputs: none changed.**
  - [Observed] The diff touches no file under `apps/` or any product package: only two test files in `packages/cap1-system` and
    two new files under `docs/evidence/syzygy-bpyt-4-22/`.
  - So no rendered byte, wire format, refusal string or exit code of the product can change (GP-Q0 `:52-53`).
- **Test outputs on a faithful run: none changed.**
  - [Observed] 21 titles and statuses are identical at base and head.
  - `npm run test:system` gives "47 passed | 1 skipped (48)", as the PR states.
  - The 12 `runSync` rows' expected literals are unchanged and still pass.
- **Test outputs that do change:**
  - Under a regression that admits a `runSync` argv, a row now fails by `ETIMEDOUT` in about 20 s. Before, it hung, and with no
    `--port` it bound 7477.
  - Under P2 a row now fails, where before it passed.
  - **Under P1 a row now passes, where before it failed (F1).**
  - Under a uid of 0, the mode-000 row is reported skipped instead of running.
- **Governance outputs.** `check_governance` gives "32 OK, 21 WARN, 0 FAIL (53 checks)", and `check_quotations` reports
  0 findings.
- **New evidence files.** `runsync-and-root-probe.json` and `tools/runsync_and_root_probe.py`. Both check out against the git
  objects (§3.6).

## 6. Verdict per acceptance criterion

**syzygy-bpyt.4.22:** "Under R5 (spec in docs/evidence/syzygy-bpyt-8-2/) the system test fails within its timeout instead of
hanging, and no process binds 7477 (recorded); the unmutated suite passes; test-only, class stated; Tests: +0 ~n -0."
- **Fails within its timeout instead of hanging, nothing on 7477, recorded: met.**
  - [Observed] In the record and in my `head-R5` run.
  - The base-side hang and the 7477 binding are reproduced in `base-R5` and `base-R5-hang`.
- **The unmutated suite passes: met.**
- **Test-only: met.**
- **Class stated: not met as stated.** The PR says "none", and I rule classes 1 and 6 (N1).
- **`Tests: +0 ~13 -0`: met.** 12 `runSync` rows by count, plus 1 skip row.
- **Overall: blocked by F1.** F1 is not one of the bead's criteria. It is the brief's REVISE condition, "an environment change
  that can mask a regression in what the daemon entry admits or refuses".

**syzygy-bpyt.4.25** (narrowed to the `state-dir.system.test.ts` row):
- **AC1, "both rows skip under a uid of 0, in the repository's idiom, with a comment": met for the one row in scope.**
  - The idiom and comment are present.
  - The skip under a uid of 0 is shown by both shims, for the condition only.
  - [Inferred] Real-root behaviour stays unobserved.
- **AC2, "as the real user, both files pass unchanged (titles and counts); Tests delta stated": met for the file in scope.**
  - 6 titles, 6 passed at base and head.
  - The delta is stated.
- **AC3, "class stated … and independent review": the review is met (this raw). The class is ruled here as class 1.** The
  disposition should record it (N1).

## 7. Test quality

Against the test-rigor bar:
- **Bar 6 (deterministic): improved.**
  - A wrongly admitted argv was an indefinite hang that bound a shared port. It is now a bounded, deterministic failure.
  - The 20 s budget held with 4.6× margin at load1 75.75 (§3.3).
- **Bar 7 (a failure names the defect): improved.**
  - The thrown message names the argv and `ETIMEDOUT`. Without it the failure reads "expected { status: null, …(2) } to deeply
    equal { status: 1, …" (T3).
  - Minor: the message appends "(timeout 20000 ms)" even when the error is not a timeout, for example ENOBUFS.
- **Core rule ("A test is worth keeping only if some plausible bug makes it fail"): regressed at one row.**
  - The governed-plane row no longer fails on P1, a plausible refactor bug that it used to catch (F1).
  - The same environment adds a kill, P2.
  - The repair keeps both kills.
- **The skip guard is the repository's idiom, and it is honest about its limit.**
  - The comment says why root cannot produce EACCES.
  - Like every `skipIf` guard, it can only be checked by counts (N3).
- **Bar 10 (growth): no new tests.** The delta `+0 ~13 -0` is stated and correct.

## 8. Cleanup, and every kept file

- **Deleted:**
  - the scratch clone `<r>clone`;
  - the TMPDIR `/tmp/r525-sys`;
  - superseded probe records from earlier versions of `probe.py`. Every kept record was re-run with the final tool;
  - an empty `npm-ci.log`.
- **Left in `/tmp`:** nothing. Each probe TMPDIR was removed by the probe, and `find /tmp -maxdepth 1 -name 'r525-*'` printed
  nothing.
- **Processes and ports:**
  - Every process I killed was a descendant of my own vitest or my own `sleep 12`, killed by pid.
  - Survivors were 0 in all 30 records.
  - `ss -ltnpH 'sport = :7477'` was empty at the end.
- **Kept**, under `<r>` (sha256):

| File | sha256 |
|---|---|
| `tools/probe.py` | `0d82288a92a49bfe8af739ee1f15a61ed3b208b672b07e4c85cb2d18b076cfa6` |
| `tools/run_cases.py` | `a44e022ab33eefc133034b69d2f8d689f1ea76b27cbc23da5520edf0fb4bfdbb` |
| `tools/check_record.py` | `efc98aaeecf2d501bf90f629e0692c91cf9bd1050f525f7b483b7fedb87517cc` |
| `tools/selftest.py` | `b30248659adeece97893f50e67e166a7354fb805c5a6af06e0682f6af086231a` |
| `tools/summarize.py` | `c96700bdb2ed4db21f56722798b5fabf171278ddf0deab88ec1f00a769c93645` |
| `tools/mode_sweep.py` | `7fe60866f1fb50111e00079fb8a32a026ad84641d120fe714764b57c8fd83f20` |
| `tools/entry_sweep.py` | `2763085417519d0fa9f2419ce404d9512785e4a9016424fa319d6aad57e68a3a` |
| `tools/load_margin.py` | `08efcb3088b3613535d6f2fee3153907a2a070c7af47a33910106ea5f7a545d1` |
| `tools/spawnsync_grandchild.mjs` | `7245dac6fad2cdc0ab399b7c9b320142b2ac4649fc3eb96b44db59f4b02ae119` |
| `rederived.diff` | `c780b020a574d0edb253ed77367df21e4ff415c71420f59a3b5590362c126087` |
| `probe-summary.txt` | `818ee9b03dda0152686df0ca619a755a153082e0de2e541b4080f49732e51561` |
| `check-record-result.txt` | `39c54edf3bd7355e28ce772b89ed3eb8c5b4d9124f5188f6af12a961ac218239` |
| `check-record-selftest.txt` | `17f3707cef325ea23bbdecd4a8d91e0b602357ac9beb9fa969822a0981c954f4` |
| `mode-sweep-head.txt` | `670e01b7b203e26c717d4d40c0e2978092fe322a648276736924ef7cac3e7235` |
| `entry-sweep-head.txt` | `b94b51a4128cdad71d927dec6a06a3d18b67241cc484c58a883139b98f9d935f` |
| `spawnsync-grandchild.txt` | `90ba683929c733fa5932973482b104fcb2ec5d596649ad8163dbce3fa5799010` |
| `load-margin-8.json` | `b4400a261e48f0f7383f1036174f8d5cee2f40c0bd2f24d87c33150cf2970a11` |
| `load-margin-32.json` | `53a4c290ab3666df8e0e081af75e714e4e320aef0fa8bf13d64a6901e60f5070` |
| `test-system-head.log` | `9374a2f1186cb40728a5a56fea06330303a42a0185dd584ea70d6969d461a83b` |
| `typecheck-head.log` | `e2c8b37ba8c2974699631485e9c24406b9eb7c793bbbd178345cd4a0f86ce13f` |
| `check-governance-head.log` | `2ca1f141468ae09a5cb1a04098c45cf25bbdc25b06ed39cecd18487543096ed8` |
| `check-quotations-head.log` | `7b0cd36d8aed015d576743c255ab4f7728ee1c147f3b685de18d042f2d970c48` |
| `build-head.log` | `598506fd1002083a8b8895ef5213fdd81296d012d6258a5a48b043ba4543ce93` |
| `run-head.json` | `8ec96f2a67e8dd6328f20098c355f0e14c07ae2d76b86d87b13ddd2280bcecf3` |
| `run-base.json` | `94b398345c9a783ac32dd5952291fcffe8ab08616d138e06f30872e4e488ccc1` |
| `run-COUNT-runSync-rows.json` | `3a3946eea7406285b3cc394b4c365224b7be0211796c56ab19aafe6e243bb202` |
| `run-head-R5.json` | `638c7a393aaf6fc81328d225d5b5221d15c71538faadac6634e56d8a6f21a5da` |
| `run-head-R9.json` | `d10cab2c363343b5f3cb0b6351021467ac69d829e01013ca6a0c8685a516c2eb` |
| `run-base-R5.json` | `9eada01ac571d346c018718935138d136740551d404a2d1184bc6a7b878c184b` |
| `run-base-R5-hang.json` | `1be4a6d24924c073e894027df3f3bffb01fe01c1559a487682d9c065b748f149` |
| `run-base-R9.json` | `ec4377451495cfcf1fe8399eccab68cd30510b77ce7eb73a25edc49b1587edbf` |
| `run-T1-no-port-env-R5.json` | `c21c60ef6833c67072b42c5f62a817316ecfe19b36628ab75bf26bf7ec5591ee` |
| `run-T2-no-timeout-R5.json` | `f3dc3d0a83dddd0930d24180bdddca1464f76c02eb743e57d28bc72e0fb2de50` |
| `run-T3-no-throw-R5.json` | `4802df50abc894f187ae459bfb7f801d3177299e7a3d3867dedaeb74622073bf` |
| `run-P1-default-dropped-head.json` | `c78954d338679a583290ef42b8e0583f7be30f6b29df9a3b65c221ea762aca4e` |
| `run-P1-default-dropped-base.json` | `128a706b23b269c1ea28e35d1ac50abdf5da66b02ce104c48be756a5d9857f24` |
| `run-P1-default-dropped-system-head.json` | `629836086ace4a4d7573f47b7d8f75dce20ee2fafe10d48e3e2d3e5475a22e6f` |
| `run-P1-default-dropped-system-base.json` | `a4c6d1b346fc5c5769b21c20334e12507d554ca43c78c064853b09bcc63f586e` |
| `run-P2-env-over-flag-head.json` | `b7c78ffb61f343c4457f82a7da6f18cda6090deea53c020e00876760a621b65b` |
| `run-P2-env-over-flag-base.json` | `75d589ac4533a64c5a61f84358297c2327a3881d8c6c7412074132e7fb25eaa6` |
| `run-FIX-head.json` | `1d14bf06e3b07bbacf9d42b3585f220d305492ef6cf179461f611bb21a0d0bfa` |
| `run-FIX-P1.json` | `eb36700b34792e6af8963cfb2dbb206d208e655d923f07dee3ab9a03d52f6d35` |
| `run-FIX-P2.json` | `e9765835c255e6216d6b62faa6e78632c471cea6a37f6d587eb12546a8ae9cf9` |
| `run-FIX-R5.json` | `50e427dd6a1860c4417a6b9db21e486a47697a2b7ea45624cfdc103a07726324` |
| `run-FIX-R9.json` | `78b3baeed999975d817b17820b0fa30be5f2720f2af15d61c0d552d42be838b8` |
| `run-shim-row-head.json` | `451359f90e6bba58f0efb85f46c6a8b7491593c57ec643fbc2fcccfd155caf41` |
| `run-shim-row-base.json` | `44bf684d20eec1cbdd84debc0570430fbaa4b492f44f4fd98ea4172c86bb754a` |
| `run-noshim-row-head.json` | `0b0b8143473a1f46e10d611fd210ce4739c06f862adb70ed5c6dd85de725ce85` |
| `run-shim-file-head.json` | `22c01ef49be2c26b49d07796d659e762e75537dbdafbc52bb946af271b5f3d16` |
| `run-shim-file-base.json` | `be50e945cfac732c11b801dc620f36b80f6900fc65081d1937db53ae0a5b193b` |
| `run-S1-skip-always-noshim.json` | `9c4479f345ca775dea633259d83d0e55765cf8368a33111c5986a4f62707382b` |
| `run-S2-skip-inverted-noshim.json` | `a504ccc87c78651e20aa4c444f3d489cd6a629b28b3f093315366756dcdb155f` |
| `run-S2-skip-inverted-shim.json` | `82ee517b71ce0102e21c9b20c35311da476e95fbdb3fffa9029e8d8165bdf15d` |

That is 53 kept files besides this raw: 9 tools, 30 probe records and 14 other results. `find <r> -type f | wc -l` gives 54,
the raw included.
