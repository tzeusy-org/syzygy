# R-GP-IMPL-SKIPPED-POPULATION-1 — CC-REV-1 implementation review of syzygy-bpyt.4.30, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 1e444071
Subject: r1-review.diff sha256 ce5c6cc7ef61d9a8cd125aec7e3f9f1f863b1a9dc5b5c20a4e80431416d2bc9c

Reviewer: rev-527, fresh context, did not author the change. Date 2026-10-25. Host: 12 cores, uid 1000, node v24.6.0,
vitest 3.2.7. No target-repository content was read. No credential file was opened. Nothing was pushed, commented or merged.

Paths below are relative to `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-527/`
unless they are repository paths.

## 1. Subject identity checks

- [Observed] `sha256sum lead/b430/r1-review.diff` gives
  `ce5c6cc7ef61d9a8cd125aec7e3f9f1f863b1a9dc5b5c20a4e80431416d2bc9c`, the brief's digest.
- [Observed] In my scratch clone, `git diff a088f1caf061c1a2062527ce8521c9b64c3c7fd1 1e444071112522ce1b9eb43a8d3964174c54c477 | sha256sum`
  gives `ce5c6cc7ef61d9a8cd125aec7e3f9f1f863b1a9dc5b5c20a4e80431416d2bc9c`. **The digest matches.**
- [Observed] `origin/agent/syzygy-bpyt.4.30` is `1e444071112522ce1b9eb43a8d3964174c54c477`. `git merge-base 1e444071 a088f1ca`
  is `a088f1caf061c1a2062527ce8521c9b64c3c7fd1`. The stat is "3 files changed, 692 insertions(+)", one row each:
  `skipped-population-probe.json | 422`, `tools/skipped_population_probe.py | 174`, `src/skipped-population.system.test.ts | 96`.
- [Observed] `gh pr view 527` gives head `1e444071112522ce1b9eb43a8d3964174c54c477`, base `main`, state OPEN, and the same three files.
- [Observed] PR #525. Its head `ab98049294f06d3b58c1ca3bf8d2dde3e75bfad8` and `7459cc75`, the commit the lane's record names,
  carry the same `state-dir.system.test.ts` blob, `ea3fcbbfd9fa881177b314a25886c4802939412f`. The base carries `d2737dbd…`.
- [Observed] **#525 has already merged.** `gh pr view 525` gives state MERGED, merge commit `9b539e5f64241ed4ccb119753e9f4786a15be2f7`,
  mergedAt `2026-10-24T20:37:35Z`. `origin/main` is now `e875e8f064d3f13f50c6b6cb5f565dfa3e40afaa`. It contains `9b539e5f`, and its
  `state-dir.system.test.ts` blob is `ea3fcbbf…`. Between `a088f1ca` and `e875e8f0`, three files change under `packages/` and
  `apps/`: `daemon-entry-unchanged.system.test.ts`, `state-dir.system.test.ts` and `packages/polaris-dossier/src/launched.test.ts`.
  None is one of this PR's three files.
- [Observed] Only one open PR touches `packages/cap1-system/`: #527, through `skipped-population.system.test.ts` alone
  (`gh pr list --state open`, filtered on file paths).

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at `1e444071`):

- `:18-20`: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- `:31-43`, the classes:
  1. "**authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6)";
  2. "**graph identity** — entity identity minting, continuity, split/merge";
  3. "**deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7)";
  4. "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths";
  5. "**data migration** — `.syzygy/**` schema migrations, any identity-affecting store change";
  6. "**public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on";
  7. "**certificate logic** — when certificates exist (post-V1, future-tagged), any code that grants, invalidates, or renders them."
- `:45-47`: "Class membership is contested by default and is never finally determined by the agent performing the change".
- `:49-50`: "The change record states which classes the change touches, or "none,"".

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):

- `:52-55`: ""Behavior-preserving" means none of the following changes: a rendered byte, a wire format, a refusal string or an exit
  code; a signed or digest-bound artifact; a consent, security or retention decision."
- `:60`: "Each pull request states which CC-REV-1 classes it touches."
- `:62`: "pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security), and
  class-6 pull requests that remove an endpoint."
- `:65`: "a rule-6 mutant for each predicate".

**AGENTS.md** at `1e444071`:

- Verification rule 4: "Read a check's output, not its exit code, and check its denominator against the whole population."
- Rule 6: "Mutate the input and confirm the check fails, per predicate, before trusting it".
- Rule 9: "A claim of absence needs a sweep with a denominator."
- Rule 11: "An evidence record names its subject and the subject's digest".

**Test-rigor bar** (`th-engineering/subskills/test-rigor/SKILL.md`):

- Core rule: "A test is worth keeping only if some plausible bug makes it fail."
- Item 4: "Expected values are literals or independently derived."
- Item 6: "Deterministic or quarantined".
- Item 7: "A failure names the defect … A maintainer should localize the bug from failure output alone."
- Item 10: "Reviews state the net test delta".

**Class ruling: none.** I rule each class:

- **No class-1 subject.** The change touches no write-universe, typed-authority table or adapter authorization.
- **I record the contested reading and reject it.** Under uid 0 the check's expected set admits a skip of the state-dir mode-000
  row, and that row tests the governed-plane check, which the PR 525 review ruled class 1. The admission adds no skip:
  - the skip itself came with #525, under that review;
  - this check only refuses populations other than the literal; it grants none.
- **Classes 2, 3, 5 and 7: none.** It mints no identity, composes no snapshot, migrates no store and has no certificates.
- **Class 4: none.** It adds no auth surface and no egress path. The child process is a local `node -e` collection, and no
  network was seen, since collection runs no test (§3.8).
- **Class 6: none.** No endpoint or adapter contract changes, and nothing an external consumer depends on. The test tier is not
  an interface.
- **GP-Q0 `:52-55`.** No product rendered byte, wire format, refusal string or exit code changes: the diff touches no file under
  `apps/` and no product package. The one exit code that changes is the system tier's, and only on a tree whose skipped
  population differs from the literal. That is the bead's purpose.
  - [Observed] No digest-bound artifact: 0 tracked `*MANIFEST*` files cite `packages/cap1-system/`, and the three new paths are
    named by no other tracked file.
  - No consent, security or retention decision changes.
- **GP-Q0's three further checks** (`:62`) are not triggered, since the class is none.
- The PR's guess is "none", and I agree.

## 3. What I ran and the results

All runs used my scratch clone (`git clone /home/tze/GitHub/syzygy`) at `1e444071`, after `npm ci` ("added 115 packages") and
`npm run build` (exit 0). Each vitest run had its own TMPDIR, `/tmp/r527-<case>-<n>`, deleted afterwards.

`tools/run_cases.py` does the following for each case:
- applies the case's edits, and refuses any `old` fragment that does not occur exactly once;
- runs `npx vitest run --config packages/cap1-system/vitest.config.ts`, filtered to `skipped-population` or, for full cases,
  unfiltered. It uses the JSON reporter, in a session of its own, and strips `SYZYGY_FRESH_CLONE`, `CI` and `NODE_OPTIONS` unless
  the case sets them;
- walks descendants by `/proc` parent links every 0.25 s;
- 3 s after vitest exits, counts as a survivor any process that was seen (same start time) or that sits in any session one of
  them led. It then kills only those PIDs;
- writes the files back, and asserts the tracked tree is clean.

Every run record is `run-<case>-<n>.json`, and `summary.txt` has one line per run.
- 83 runs; tree clean after every one.
- [Observed] One record was lost to a naming bug in my tool, since fixed. The first `full-fc` run, "full-fc#0: exit 0 wall 40.5s
  counts {'passed': 49} check ('passed', 4584) survivors 0", was overwritten by a later `run-full-fc-0.json`. Its line above is
  quoted from my transcript, and it is not in the 83.

### 3.1 The record, against the git objects (rules 6 and 11)

`tools/check_record.py clone 1e444071…` gives "67 OK / 67 checks; 0 FAIL" (`check-record-result.txt`). [Observed]:

- `commit` `fbd6fb35…` resolves and is an ancestor of `1e444071`. `baseCommit` is the merge base, and `rootSkipCommit` `7459cc75…`
  resolves.
- The tool's sha256 `15efb368…` equals the tool blob both at `fbd6fb35` and at `1e444071`.
- Each of the six `files[…].head` digests equals its blob at `fbd6fb35`, and each blob is unchanged from `fbd6fb35` to `1e444071`.
- Each of the 7 edited cases' `old` fragments occurs exactly once in its file at `fbd6fb35`, and `new` differs from it.
- Both `filesFrom` digests equal the `state-dir.system.test.ts` blob at `7459cc75`.
- Every case's `tests` holds exactly the one check row, so every case is a filtered run.
- Every recorded `passes` agrees with its exit code, row status, needle, survivors and, for `collection-hangs`, the 45,000 ms floor.
- `allPass` is true and equals the conjunction over 11 cases.

### 3.2 The lane's forms, reproduced

| Case | Result (verbatim head of the failure) |
|---|---|
| `control` (×8) | passed every time |
| `control-fc` (`SYZYGY_FRESH_CLONE=1`, ×5) | passed every time |
| `control-ci` (`CI=true`) | passed |
| `S1` (`it(` → `it.skipIf(true)(` on the mode-000 row) | failed: "skipped but not expected: ["src/state-dir.system.test.ts > RTF-1 — state-dir governed-plane check resolves symlink reality > rejects an unreadable state-dir path as named invalid before writes or a listener"]; expected but not skipped: []" |
| `S1-fc` | failed, the same row named, "expected [ Array(1) ] to deeply equal []" |
| `S1-merged-literal` (#525's file, `skipIf(isRoot)` → `skipIf(true)`, the bead's literal S1) | failed, the same row named |
| `it-skip` (credentials row) | failed: "skipped but not expected: ["src/credentials.system.test.ts > … > the token file is owner-only (mode 0600)"]" |
| `describe-skip` (write-boundary) | failed, naming the write-boundary row |
| `guard-narrowed` (`skipIf(false)`) | failed: "skipped but not expected: []; expected but not skipped: ["src/fresh-clone.system.test.ts > …"]" |
| `import-fails` | failed: "collection errors: ["rev-527 mutant: this file fails to load"]" |
| `hang` (the collection waits 600 s) | failed at row 45,226 ms: "tier collection ended (SIGKILL) with no census; it is killed at 45000 ms"; 0 survivors |

### 3.3 My own forms

Each form is my own edit; the full fragments are in `run_cases.py` and in each run record.

| Case | Edit | Result |
|---|---|---|
| `skipIf-process` | `it.skipIf(process.platform === 'linux')(` on process.system's row | failed, naming that row |
| `test-skip` | `test` imported; `test.skip(` on degradation's first row | failed, naming that row |
| `describe-skipIf` | `describe.skipIf(process.env['HOME'] !== undefined)(` on full-facts | failed, naming its 3 rows |
| `it-runIf-false` | `it.runIf(false)(` on a daemon-entry-unchanged row | failed, naming that row |
| `it-concurrent-skip` | `it.concurrent.skip(` on a credentials row | failed, naming that row |
| `it-only-credentials` | `it.only(` on a credentials row | failed: "skipped but not expected" names the file's other rows |
| `it-only-credentials-ci` | the same, `CI=true` | failed: "expected 1 to be +0 // Object.is equality" (N3) |
| `it-only-ci` | `it.only(` on process.system's only row, `CI=true` | failed: "expected 1 to be +0" |
| `it-only` | the same, no `CI` | **passed**: an equivalent mutant. The file has one row, so `.only` skips nothing; the whole tier also reads 48 passed / 1 skipped (`full-it-only`) |
| `it-todo` | an `it.todo(…)` added to credentials | failed: "skipped but not expected: ["src/credentials.system.test.ts > … > a todo row added by rev-527"]" |
| `describe-todo-existing` | `describe.todo(` on write-boundary's suite | failed, naming its row |
| `describe-todo` | an empty `describe.todo('…')` added | **passed**: it adds a placeholder and skips no row, so it is not over-broad |
| `expected-widened` | the check's expected set always includes the root row | failed against the faithful tier ("expected but not skipped" names it) |
| `expected-widened-S1` | widened set plus S1 | passed: a check edited to expect a skip accepts that skip |

- `xit`, `xtest` and `fit` do not exist in this Vitest. [Observed] The `export { … }` list of `vitest/dist/index.d.ts` names
  `describe`, `it`, `suite` and `test`, and the file has 0 occurrences of `xit`.

### 3.4 Forms of over-broad skipping that pass the check

| Case | Edit | Check | Whole tier (unfiltered) |
|---|---|---|---|
| `conditional-registration` | `if (process.platform !== 'linux') it('rejects an unreadable…'` | passed | exit 0, `numTotalTests` 48, `{'passed': 47, 'skipped': 1}`, 10 files |
| `config-exclude` | `exclude: ['src/write-boundary.system.test.ts']` in the tier config | passed | exit 0, 48 tests, 9 files, `{'passed': 47, 'skipped': 1}` |
| `config-include-narrowed` | `include: ['src/{d,e,f,s}*.system.test.ts']` | passed | not run unfiltered |
| `runtime-ctx-skip` | `async (ctx) => { ctx.skip();` in a credentials row | passed | exit 0, `{'passed': 47, 'skipped': 2}` (disclosed residual) |
| `each-empty` | `it.each([] as number[])(` on process.system's only row | passed | **exit 1**: "No test found in suite src/process.system.test.ts", so the tier already catches it |

So two forms the PR does not disclose make a guard that skips too often fail no exit code: an unregistered test, and a file that
leaves the tier. See N1.

### 3.5 Fail closed: mutants of the check's own predicates

| Case | Edit | Result |
|---|---|---|
| `api-renamed` | `vitest.collect()` → `vitest.collectTests()` | failed: "tier collection ended (1) with no census" |
| `vacuous-census-fc` | census `tests` forced empty, `SYZYGY_FRESH_CLONE=1` | failed: "expected undefined to be 'pending'" (the self-row check) |
| `vacuous-census-fc-no-self-check` | the same, with the self-row `expect` deleted | **passed**, so the self-row predicate is load-bearing on the CI arm |
| `import-fails-no-errors-check` (and `-fc`) | import failure, with the errors `expect` deleted | failed: "expected 1 to be +0". The exit-code predicate backs the errors predicate |
| `exit-nonzero` | `process.exitCode = 3;` after the census line | failed: "expected 3 to be +0" |
| `exit-nonzero-no-code-check` | the same, with the code `expect` deleted | **passed**, so the code predicate is load-bearing (`it-only-ci` is a real instance) |
| `state-renamed-fc` | the `'skipped'` comparison renamed `'skip'` (as if Vitest renamed the state), `SYZYGY_FRESH_CLONE=1` | **passed** |
| `state-renamed-fc-S1` | the same, plus S1 | **passed**, so on the arm CI runs, a state rename makes the check accept a real over-broad skip (N3) |

- [Observed] The predicate "census lacks the row itself" was mutated as the brief asked. With it deleted, a vacuous census passes
  under `SYZYGY_FRESH_CLONE=1`; with it kept, the same census fails.

### 3.6 Repeated runs, timing and margin

- [Observed] Unfiltered tier, 5 runs with `SYZYGY_FRESH_CLONE` unset (`full` ×5): each "exit 0", `{'passed': 48, 'skipped': 1}`,
  check row 3,263–5,542 ms.
- With `SYZYGY_FRESH_CLONE=1` (`full-fc`): 6 runs, 5 records kept plus the overwritten one quoted above. Each "exit 0",
  `{'passed': 49}`, check row 4,007–8,901 ms, and wall time 31–44 s, the fresh-clone row included.
- Filtered row: 8 `control` and 5 `control-fc` runs, all passed.
- Over the 31 unmodified runs (`summary.txt`, last line): "unmutated runs: 31, check passed in 31; check-row ms min 1372 max 8901
  (max at full-fc#3); load1 range 13.85-59.28". This set includes the merged and main-merge forms below.
- **The 45 s timeout has margin.** The slowest faithful collection, 8.9 s at load1 about 27, sits about 5× under 45 s. Under the
  heaviest load seen, load1 57–59, the filtered row took 6,038 and 5,185 ms. The hang case fails at 45,226 ms, and with my lifeline
  edit at 45,107 ms, both under the tier's 60,000 ms `testTimeout`. [Inferred] A faithful run would need its collection more than
  5× slower than the slowest one seen to fail by the timer.

### 3.7 The uid-0 arm (a shim checks the condition only; these processes are not root)

- **The shim.** `tools/getuid-zero-scoped.mjs` sets `process.getuid = () => 0` only where `process.argv[1]` is undefined (the
  `node -e` collection child) or ends with `/tinypool/dist/entry/process.js` (the test workers and the collection's workers).
  - [Observed] `tools/argv-log.mjs` logged 36 node processes in one filtered run: `npx`, `node_modules/.bin/vitest`, 12 outer
    tinypool workers, the argv-less collection child and its 21 tinypool workers.
  - So the shim does not reach `npx`, vitest's main process or the daemon, whose `argv[1]` is `apps/syzygy/dist/main.js`.
  - Every shim run is unfiltered.

| Case | Tree | Result |
|---|---|---|
| `shim-subject` | `1e444071` alone | exit 1, `{'passed': 47, 'skipped': 1, 'failed': 1}`. The failing row is the check: "skipped but not expected: []; expected but not skipped: ["src/state-dir.system.test.ts > RTF-1 … > rejects an unreadable state-dir path as named invalid before writes or a listener"]". The mode-000 row itself passed, since the process is not really root |
| `shim-merged` | `1e444071` + #525's state-dir file from `ab980492` | exit 0, `{'passed': 47, 'skipped': 2}`: the fresh-clone row and the mode-000 row |
| `real-merge-shim` | merge `1bb5a921` (`1e444071` + `ab980492`) | exit 0, `{'passed': 47, 'skipped': 2}`, the same two rows |
| `main-merge-shim` | merge `4603311b` (current main `e875e8f0` + `1e444071`) | exit 0, `{'passed': 47, 'skipped': 2}`, the same two rows |
| `noshim-merged`, `real-merge-full`, `main-merge-full` | the same trees, no shim | exit 0, `{'passed': 48, 'skipped': 1}` |
| `full-fc-merged`, `real-merge-fc`, `main-merge-fc` | the same trees, `SYZYGY_FRESH_CLONE=1` | exit 0, `{'passed': 49}` |

- [Observed, shim] The uid-0 arm fails at the subject alone and passes with #525's file, in the swapped form, at a real merge, and
  at a merge with current main.
- [Unknown] Under a real root: not run, since no root runner exists.

### 3.8 Processes, recursion and daemons

- [Observed] `sessionsSeen` is 2 in all 83 runs: vitest's session and the collection's. Recursion would add a third, because a
  collected check row that ran would start another collection.
- [Observed] Survivors: 0 in 82 of 83 runs. The one exception is `hang-interrupted`, an injected interruption (N2).
- [Observed] A direct collection of the unmodified tier (`census-unmutated.txt`) gives these counts:
  - "Counter({'pending': 48, 'skipped': 1}) 49 distinct 49" over 10 test files, so no test is counted twice;
  - the check row itself is `pending`, so it was collected and not run;
  - the one skipped row is the fresh-clone row.
- [Observed] 14 runs captured command lines. In the 11 filtered ones, 0 command lines carry `<clone>/apps`, so no daemon started.
  The 3 unfiltered ones carry 1–2 each, from the tier's own daemon rows. My first test looked for `dist/main.js`. My tool truncates
  command lines at 160 characters, and the long clone path cut that suffix off, so I re-ran the test on the path prefix.

### 3.9 Gates at `1e444071`

- `npm run test:system`, with `SYZYGY_FRESH_CLONE` and `CI` unset: " Test Files  9 passed | 1 skipped (10)", "      Tests  48 passed | 1 skipped (49)",
  " ✓ src/skipped-population.system.test.ts (1 test) 3531ms", exit 0 (`test-system-head.log`).
- `npm run typecheck`: exit 0.
- `python3 scripts/check_governance.py`: "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted", exit 0.
- `python3 scripts/check_quotations.py`: "37 quotations examined in 18 of 943 .md files scanned (loc-paren-quote 2, loc-colon-quote 25,
  quote-paren-loc 10), 0 findings", exit 0.
- Hosted node-ci run `40129597528` at `1e444071` (`hosted-node-ci-40129597528.txt`): " ✓ src/skipped-population.system.test.ts (1 test) 2004ms",
  " ✓ src/fresh-clone.system.test.ts (1 test) 13708ms", " Test Files  10 passed (10)", "      Tests  49 passed (49)". The
  governance-docs run `40129597539` concluded success.
- [Unknown] The PROJECT-STATUS battery: not re-run by this review. The PR's `commands=110 nonzero=0` is the lane's figure.

### 3.10 Skip-form sweep (rule 9)

`tools/skip_sweep.py` at `1e444071` covers "files swept: 12; hits: {'modifier': 5, 'runtime': 1, 'guarded': 1, 'aliased': 0}"
(`skip-sweep-head.txt`).
- **Modifier hits:** the only skip modifier is `fresh-clone.system.test.ts:37`, `it.skipIf(!RUN_FRESH_CLONE)(`.
  - The other four hits are three non-empty `it.each` tables (`credentials.system.test.ts:39`, `daemon-entry-unchanged.system.test.ts:108,113`)
    and the new file's comment at `:12`.
- **Runtime hits:** `ctx.skip` occurs once, in the new file's comment at `:13`.
- **Guarded hits:** one, a false positive at `skipped-population.system.test.ts:40` (`state: test.result()`).
- **Conditional registrations:** 0, so N1's two forms are prospective only.
- **Second method:** `git grep -F -c` agrees. `.skipIf` has 1 hit (fresh-clone); `.runIf`, `.todo`, `.only` and `context.skip`
  have 0; `.skip` hits fresh-clone 1 and the new file 2.
- The PR's sweep claim checks out.

## 4. Findings

None blocking. Five notes.

### N1 — Two over-broad skip forms pass the check and the whole tier: a test that is never registered, and a file that leaves the tier (low–medium)

- **Evidence.** [Observed, §3.4]
  - `conditional-registration`: `if (process.platform !== 'linux') it('rejects an unreadable…'` removes the mode-000 row on Linux.
    The check passes, and the unfiltered tier exits 0 with 48 tests, `{'passed': 47, 'skipped': 1}`.
  - `config-exclude` and `config-include-narrowed` drop files from the tier through its config. The check passes, and with the
    exclusion the tier exits 0 over 9 files.
  - Renaming a file off `*.system.test.ts` is the same class. [Inferred, not run]
  - The PR's residuals name only "a test that skips itself while it runs (`ctx.skip()`) or returns early".
  - The new file's head comment says what collection sees (`:12-14`) and names only `ctx.skip()` as unseen.
- **Why a note and not blocking.**
  - AC1 defines the check over "the set of skipped system-tier test titles". An unregistered test, or a file outside the tier, is
    absent from that set, not skipped in it.
  - The tier has no conditional registration today (§3.10, 0 over 12 files).
  - If the coordinator reads AC1's "skip guard" to include `if (cond) it(…)`, this note becomes a REVISE.
- **Failure scenario.** A later root skip is written `if (!isRoot) it(…)` rather than `it.skipIf(isRoot)(…)`, and a later edit
  widens it to `if (false)`. Alternatively, a config edit excludes a slow file. Every gate stays green, and the only trace is the
  total test count, which is the count N3 of the PR 525 review said no gate reads.
- **Proposed fix.**
  - In the disposition, add both forms to the PR's residual list and to the head comment's "not seen" sentence.
  - For a follow-up bead, pin the tier's file population. Print `files: testModules.map((module) => module.moduleId)` in the census,
    and assert that it equals `readdirSync('src').filter((name) => name.endsWith('.system.test.ts'))`.
    - [Observed] I ran this edit: `fileset-control` passed, `fileset-config-exclude` failed with "tier files collected vs on disk:
      expected [ …(9) ] to deeply equal [ …(10) ]", and `fileset-config-include-narrowed` failed with "[ …(7) ] … [ …(10) ]".
    - It costs no literal update when a test is added.
  - Conditional registration needs a per-file count or a title literal. That costs an update per new test, so either take that
    cost or disclose the form.

### N2 — An interrupted outer run orphans the collection's session (low)

- **Evidence.**
  - `spawn(…, { detached: true })` (`skipped-population.system.test.ts:56`) puts the collection in a new session.
  - The only thing that kills it is the 45 s timer in the test worker (`:63-65`).
  - [Observed] `hang-interrupted` sends SIGTERM to vitest's process group 12.2 s into a hung collection. 13 processes survived:
    the `node --input-type=module -e` child, 11 `node (vitest N)` workers and `esbuild --service=0.2`. My tool then killed them.
  - [Observed] On the unmodified tree a collection ends by itself within 1.4–8.9 s, so an interruption leaves an orphan only for
    that long.
- **Failure scenario.**
  - A collection that genuinely hangs, from a future Vitest bug or a tier file that blocks at import, meets an interrupted run.
  - The interruption could be a Ctrl-C (SIGINT reaches only the foreground group), or a job runner that kills vitest's group.
  - The session then lives until it ends by itself, possibly never. The PR's claim that a hung collection "leaves no process
    behind" holds only when the worker survives to the timer.
- **Proposed fix.** Give the child a lifeline. I ran this edit at the head of `COLLECT`:
  `const parent = process.ppid; setInterval(() => { if (process.ppid !== parent) process.kill(-process.pid, 'SIGKILL'); }, 500).unref();`
  - [Observed] `lifeline-hang-interrupted`: 0 survivors.
  - `lifeline-control` passed.
  - `lifeline-hang` still failed at the timer, 45,107 ms, with 0 survivors.
  - The timer is `unref`'d, so it does not keep a finished collection alive.

### N3 — The census's state vocabulary is not pinned, and the exit-code assertion names nothing (low)

- **Evidence.**
  - [Observed] `state-renamed-fc` and `state-renamed-fc-S1` pass. They change the comparison string from `'skipped'`, as if Vitest
    renamed the state. Under `SYZYGY_FRESH_CLONE=1`, the arm the node CI job runs, the expected set is empty and nothing matches,
    so the check accepts S1.
    - The `SYZYGY_FRESH_CLONE`-unset arm would still fail, since it expects the fresh-clone row.
    - The PR's residual "If an upgrade changes it, the child prints no census and the row fails. It does not pass silently" is
      true for `api-renamed`, not for this case.
  - [Observed, `only-ci-direct-collection.txt`] Under `CI=true` an `it.only` gives a census with "states {'skipped': 11, 'pending': 37,
    'failed': 1}", "errors []", exit 1, and empty stdout and stderr outside the census.
    - The row fails only at `:84`, `expect(code).toBe(0)`, with "AssertionError: expected 1 to be +0 // Object.is equality".
    - That message names neither the `.only` row (state `failed`) nor the 10 newly skipped rows. Test-rigor item 7 asks that "A
      maintainer should localize the bug from failure output alone".
- **Failure scenario.**
  - A Vitest upgrade renames a state, or reports `todo` under a state of its own: hosted CI then accepts any over-broad skip until
    someone runs the tier locally.
  - A stray `.only` reaches CI: the row goes red with a message that points at nothing.
- **Proposed fix.**
  - Assert that every census state is `pending` or `skipped`, naming the rows that are neither.
  - Give `expect(code)` a message with the child's stderr and those rows, or move it after the set comparison, so the set diff
    speaks first.
  - Disposition: correct the residual's "does not pass silently" to "fails when the API is gone; a renamed state passes on the
    `SYZYGY_FRESH_CLONE=1` arm".

### N4 — Two of the check's predicates have no mutant in the lane's record (low)

- **Evidence.** [Observed, §3.1, §3.5] The record mutates the tier (S1, `it.skip`, `describe.skip`, the narrowed guard, the import
  failure) and the collection (the hang). No case kills the exit-code predicate (`:84`) or the self-row predicate (`:85`) alone.
  - `import-fails` is killed first by the errors predicate (`:83`).
  - This review supplies four pairs, each run with the predicate and without it:
    - `exit-nonzero` / `exit-nonzero-no-code-check`;
    - `vacuous-census-fc` / `vacuous-census-fc-no-self-check`;
    - `import-fails` / `import-fails-no-errors-check`;
    - `it-only-ci`, a real case killed by the code predicate.
  - Result: the code and self-row predicates are each load-bearing. The errors predicate is the diagnostic, and the code predicate
    backs it.
- **Failure scenario.** A later edit drops `:85` as redundant. On the arm CI runs, a census that comes back empty, for example
  from a config whose `include` matches nothing, then passes.
- **Proposed fix.** In the disposition, cite this review's run records as the per-predicate evidence (rule 6). GP-Q0 `:65`
  does not require them for class none. Optionally, add the two pairs to `skipped_population_probe.py` on any later regeneration.

### N5 — A PR-body figure and the record tool's survivor predicate (low)

- **Evidence.**
  - [Observed] The PR says "Cost: about 2–5 s per tier run". This review measured the check row at 1,372–8,901 ms over 31
    unmodified runs at load1 13.85–59.28; the hosted run took 2,004 ms.
  - [Observed] The record tool's survivor predicate (`skipped_population_probe.py`, the `survivors` comprehension) counts a process
    only if it is in the walked set with the same start time, or if its `sid == proc.pid`, vitest's own session. The PR body says
    the walk "reaches the collection's own session", but a process of that session that the 0.25 s walk never sampled would not be
    counted.
  - [Observed] My tool also counts every session a walked process led, and found 0 survivors in all 82 runs without an injected
    interruption. So no recorded outcome changes.
- **Failure scenario.** A later reader re-derives the cost from the PR under load and finds it low by about 2×. A later regeneration
  could miss a short-lived collection-session survivor.
- **Proposed fix.** In the disposition, give the cost as "about 1.4–9 s on this host under load, 2 s hosted". On any
  regeneration, extend the tool's survivor test to `s['sid'] in {s['sid'] for s in seen.values()} | {proc.pid}`.

## 5. Every changed output, or the evidence that there is none

- **Product outputs: none.** [Observed] The diff adds three files: a system test, an evidence record and an evidence tool. It
  touches nothing under `apps/` and no product package, so no rendered byte, wire format, refusal string or product exit code can
  change.
- **Test outputs on a faithful run: +1 row, and no existing row changes.**
  - [Observed] No existing file changes, so no existing row's bytes change.
  - `npm run test:system` reads "48 passed | 1 skipped (49)" at the head, and hosted CI reads "49 passed (49)".
  - [Inferred from the diff] The base reads 47 passed | 1 skipped (48), so the delta is `Tests: +1 ~0 -0`, as the PR states.
- **Test outputs that do change:** the tier's exit code. It is now 1 on any tree whose collected skipped set differs from the
  literal: S1, an added `skip`/`skipIf`/`runIf(false)`/`todo`/`only` (in a file with more than one row), a narrowed guard, or a
  tier file that fails to load (the last also failed before, as that file's own failure). Under uid 0 it is also 1 at the subject
  alone, and 0 once #525's file is present, which main now carries.
- **Governance outputs:** `check_governance` "32 OK, 21 WARN, 0 FAIL (53 checks)", and `check_quotations` "0 findings".
- **New evidence files:** the record and tool check out against the git objects (§3.1, 67/67).

## 6. Verdict per acceptance criterion (bead syzygy-bpyt.4.30)

1. "As a non-root runner, a check (in the battery or the system tier itself) asserts that the set of skipped system-tier test
   titles equals a literal expected set: exactly the fresh-clone.system.test.ts row when SYZYGY_FRESH_CLONE is unset, and empty
   when it is set." **Met.**
   - [Observed] The check is one tier row comparing with a literal (`:22-27`, `:86-94`).
   - Unset: 8 `control` and 5 `full` runs pass, each with exactly the fresh-clone row skipped. Set: 5 `control-fc` and 6 `full-fc`
     runs pass, with nothing skipped.
   - The check mirrors the guard exactly (`=== '1'`), as disclosed.
   - Limit: "skipped" means Vitest's collected skip state (N1).
2. "Rule-6: mutant S1 (the state-dir root skip widened to always) and a mutant that adds a skip elsewhere in the tier both fail the
   check, with old/new fragments stored." **Met.**
   - [Observed] The record's S1 and `skip-added` failed with the named rows, and each `old` occurs exactly once at `fbd6fb35`.
   - I reproduced both, and the bead's literal S1 (`skipIf(isRoot)` → `skipIf(true)`) on #525's file (`S1-merged-literal`).
   - It also fails under 11 further skip forms of my own (§3.3).
3. "The check states what it does under uid 0, where the state-dir row's skip is expected." **Met.**
   - The head comment `:9-10` says: "uid 0: the same, plus state-dir's mode-000 row, which root can search, so the refusal it pins
     cannot arise there (syzygy-bpyt.4.25)."
   - The PR body's "Under uid 0" section adds the base-versus-#525 behaviour.
   - Verified by shim only (§3.7). [Unknown] under a real root.
4. "Tests delta and CC-REV-1 class stated." **Met.** The PR states "Tests: +1 ~0 -0" and "My guess is none". I rule none (§2).

## 7. Test quality (the test-rigor bar)

- **Core rule: met.** Plausible bugs make it fail: every skip modifier Vitest exposes (§3.2–3.3), a narrowed guard, and a tier file
  that fails to load.
- **Item 4, literals: met.** The expected rows are hard-coded titles (`:22-27`), never derived from the census. The env condition
  restates the bead's own predicate. It is not a tautology: changing the guard to `=== 'true'` makes CI skip, and the `'1'` arm
  then fails.
- **Item 6, determinism: met on this evidence.** 31 of 31 unmodified runs passed at load1 up to 59 (§3.6). There are no retries or
  sleeps; the only timer is the bounded kill.
- **Item 7, the failure names the defect: met for the set comparison, which names both sides; not met for the code assertion
  (N3).** The self-row assertion's "expected undefined to be 'pending'" also names nothing; a message such as "the census lacks
  this row" would.
- **Item 10, growth: met.** +1 row, and no existing test catches over-broad skipping. Collecting in a child process adds about
  1.4–9 s per tier run (N5).
- **Scope of the pin (N1).** It pins the skipped population, not the collected population. That is the AC's predicate, and
  narrower than its motive.
- **Process hygiene.** Process-group SIGKILL at the timer, no `spawnSync`, and 0 survivors in faithful and timer runs. An outer
  interruption orphans the session (N2).

## 8. Cleanup

- Deleted: the scratch clone (`rev-527/clone`, with its `node_modules` and `dist`), `/tmp/r527-ci`, and every per-run
  `/tmp/r527-<case>-<n>`.
  - The temporary branches `r527-merged` and `r527-main` were in that clone.
  - [Observed] `ls -d /tmp/r527*` lists nothing.
- Untouched: `/home/tze/GitHub/syzygy` and its `.worktrees/`. The only operations there were `git fetch` of the two branches and
  `main`, read-only `bd show`, and read-only `gh` queries.
- Kept: the manifest `kept-files-sha256.txt` (sha256 `aa8e3774a75fac32f8eee057e08cf4e5d042ed153a106a4414de23e101264681`, 102 lines),
  which lists every file below with its digest.

Tools (`rev-527/tools/`):

```
17c84c7261ad78a1c1b3683378c3270b09b23ee8bedac3a1e7914d5ecc51c6d3  tools/argv-log.mjs
3099ac5529fef3134f11edfd50724142e69960c5b059dfc45436cebf3f21fccb  tools/check_record.py
eaf77b72931253f130928566308283ac3e76d875bea9480025b20e8338eaa116  tools/collect-copy.mjs
cacd97a37fd3cdab4aca734f85920e1159ec12a34a61606de52b0378b0686554  tools/getuid-zero-scoped.mjs
4994b0cdcdfa31d9d50e76a5e21c781b7268f8cca950809992822466bf84bcf1  tools/only_ci_direct.py
e639670a72b2ce22db9ca5da1abbea0ea33633ea0ce80b9655cd7a7b267f0433  tools/run_cases.py
eb6175b671beb0fb564b727d9c7726026d960cc3f92899ef87b1a8fc4da4090e  tools/skip_sweep.py
de406fddda3ae4eb64678722429d45ad9852ab4221fcfcc06f428f64744fcdcb  tools/summarize.py
```

Result files (`rev-527/`):

```
6d7951727f16a37f8b4b08c66e96e6f3ac0f0768f5db5f5c8dc591cdb5dfffa3  build.log
4de5b1021ebba9f961b2c65eafbee42aef45c17a45a65f8d0703f56e476703bf  census-unmutated.txt
0819d06b6564704f11ecddc3bacc9a2ab1eb17aa463de32beaad509ba1125ddc  check-governance-head.log
aef6d7961292d483325921350a5fad3a637a23394b7e74a750a8797dde98ee62  check-quotations-head.log
37cef06dafca1f08d236c98225ddf077e8ffa85f70e3376c51d0acb3f5ac12ad  check-record-result.txt
c4f74000dabe78c0dd039b46ecf059a4168c70408442af1e7247acfc03954c4e  hosted-node-ci-40129597528.txt
b7f11fed1506f48649b3f59c5dd479a1a1a21c3724f6ff4ef060d2485155d250  only-ci-direct-collection.txt
f238279826a116c69fd73bacc8b18505a138ebb35e173e02dc75e9f43aa46c60  skip-sweep-head.txt
1430f34778c387027c1feda1dfd4aaea221b043b29161a7a098cfc74841b7ba1  summary.txt
425abdf983b1efefb9325624175eeffdf0277be7ba91bdfc8fda0def4e7f8684  test-system-head.log
6e9917c045c3a698cee6f074e21d7e7615b77283e0a86a575a145ac3cb673ce3  typecheck-head.log
67dfb7bbcf744df1c1c69d13b2ba5c950c7e3b931d18623d9df42001938f8759  run-S1-0.json
5c054a8613ba7ec413ace1894bcc2559a1af74b3d8aca3de98856e197b56b114  run-S1-fc-0.json
adc2f665c7378805f3ce34fddae678575ca88d463f580f2cfc2915647a0193a2  run-S1-merged-literal-0.json
bbe394220afa761eb611990a9cbfe88adbbe096f73a08c2c55b60109ce4bbc8d  run-api-renamed-0.json
82be4d83613fc6a70bbbf0a51078ec5afc8e7ab132f674c0d1006693718fb867  run-conditional-registration-0.json
8ef07f83fb3408985af2764deefb395ee1c36ef611f1116116c6b8088121eb80  run-config-exclude-0.json
5dd201aa6e66ffc72b558a17f8d5403899a97cd1678e2c9da75c0ccbcca269a1  run-config-include-narrowed-0.json
fec79cac1c26e958c30819e318950e82078f1d9c377d072eb740ed51abe9cf87  run-control-0.json
686b12b8a267ae78bfbfeb178e69391e1b0ed0dc43be35e147572d23111a8068  run-control-1.json
23fb3aaa6375a1de02eb2d80ae03d4bec2fd92a60c329b7cee8fe8635ef3b7f7  run-control-2.json
af298239f170d7c02bd0141ede55f136d82e05bfdc56d41bb86f654a52f430b8  run-control-3.json
213afb4bc051717e599ed5c0b05e5ae5c3f5e524d30ec3e5ff779734d42f54ef  run-control-4.json
20b02e7282d8d40053f7974853ab1a967a187854a7b7bcd0a0cb105086effb25  run-control-5.json
52b693a626369e79b21d36731a1ae38471e72ae036854c590fa09f7d6c4588a1  run-control-6.json
d5c0f8bd4fc63dbbbad6b073bb71d0caefda607f553c21292a7cabffa3a9ccc1  run-control-7.json
abd0959c806392ba212ea2b07788591051d971a2301238ee2a81106cdd0c1dd3  run-control-ci-0.json
dc371076f000f5a47e3a19146bd8a9491b0310423ce05a0fcbaf40fa288c0dbf  run-control-fc-0.json
b843cf45efde2d7020ea1c39679aefc727ffcb0a1478c7fa78ceb27b9ce3438b  run-control-fc-1.json
da995390382bad79979af269a68c0f3a8bb9a3c1c187ca3567bcc73fb0c5131e  run-control-fc-2.json
86df99c9feb5a19becb287a1662f512c3ff4a93ff65e20cfbb734fc1b5592007  run-control-fc-3.json
674d79eac3bd96e82ed697856257262838ddad99e1dc6a499d020710ae2e45a0  run-control-fc-4.json
928a0f119bbe719bc66ca47dbbeb3d6cb08190034d930ab5333b2b701e24dd34  run-describe-skip-0.json
044fcb17716387f6a65399bd5f8fe55232e60773f6badd00d9612c3514ec0ab2  run-describe-skipIf-0.json
08899a9e32b5c17c8e8d9c30d56be07ea4bc67fa09afcf641ae086ca622b0a5d  run-describe-todo-0.json
d7ee4a34f6ea7364978c6b7ee0c18b8c3931a0ea9ea52df67a1cc3237ab3c721  run-describe-todo-existing-0.json
cb0dc54932def2e60b96306fb2fd9d73fe205f2364e661c268e21064f4198d93  run-each-empty-0.json
b5660ac01a7939eec745d1e05ccd9704aae1c3ac35d87f693d4a5d47b3d499eb  run-exit-nonzero-0.json
af64323fb4b25df6b8b47a0fb39f0e5ee790070104c32144dcc4dd16b9c60c81  run-exit-nonzero-no-code-check-0.json
66f0214a5ce9840ad83d0f1c62d25a39ff10007de75cebb0d7beeeac75132ca8  run-expected-widened-0.json
0d80857c65ef8ae90e6e35938c47fa52dba13daaec3b2efdc94cc4e37f8b0b8b  run-expected-widened-S1-0.json
034189f12dc90cca75b82d82d4d3523db2fdedfa23a0cde3437a7394153395e4  run-fileset-config-exclude-0.json
206436d95c79852b876fb2964412e6e8de8b90a005267493f45a1f9ab4b0e02d  run-fileset-config-include-narrowed-0.json
e966cf3975244b8396de56f71f0bb75a86c6463065ecbcee7e419ed9d6b90eaf  run-fileset-control-0.json
c077b40384cde9f104cbe0d3f3881ebc61606a046393fd915d95a25d4cf01ca8  run-full-0.json
fa781c2058ac14e1f49ac4ba26ce06c7f8e606758a60cd3955e0c96ed7514f55  run-full-1.json
090698804b07426e433ec448c9524d3281b2c6b73ed9aae06798337224f97c84  run-full-2.json
cf4427052cdd43505f241a6a3286ef11dc7aecfb7108667a44cc9860ab62f4e0  run-full-3.json
b0b2e7bf9bb9b8343362cd21752449963edb4dacd99dde8a8cd037c4aafd4746  run-full-4.json
392e4759dec0408c49cbcbccc13806dcf428c3a8cf2e4fe28a794dde6e64a1c4  run-full-conditional-registration-0.json
2cdcbcec69ab8ae5cb960c58709e2398b96d826ca48b82251f094fd50c37f2b0  run-full-config-exclude-0.json
2edbcb352553d26b192602babd5214c479fc86290c8b95ae1860782e21587cea  run-full-each-empty-0.json
b9f8f9b6415b9ff2c913d2dc94f93c0aba3d028dd72d6045f0f5bef2c910829f  run-full-fc-0.json
a40fa0492f0c5e1649a38dab63bb39db44ca46b79793ccdbc7dfe6cee2df1085  run-full-fc-1.json
f97a189476fac60ac5a8e4edf5c8c7801dc549803077abf1b9fb4a067b807e84  run-full-fc-2.json
39093c5b7afb1b66a33dbaeb2e45d2c69725e4949288c0acf897f86035019e11  run-full-fc-3.json
d121965dbf806fd9e82876e528df562c105c9f82ce085e3e85848c4ce4f1f834  run-full-fc-4.json
acfc81cd63881fab2020dd2c5de396750faca718a04b4b1cff43c9fb8b1291bc  run-full-fc-merged-0.json
90a7fd4e0e44d78ae63f21c44042823aaea223a793dfd667a8d0051c21287169  run-full-it-only-0.json
c6a9cc7bfa60f25bdb4e39d3c9bdab8f1e2bed88ec9eecc9ba37cb92e35451f6  run-full-merged-0.json
f89b5cca89b8928449bce72281962f2dd3814ff94478c7b8950f42df71d2a460  run-full-runtime-ctx-skip-0.json
723d2f46bb27e6ab3f43ee54ee0f44ccfaa656e3017cdd28b77c39c0458568b8  run-guard-narrowed-0.json
8a3d21b2f2c990d412b2f9d916901d605b859bd70e1c697e40cba303508f99cb  run-hang-0.json
6b7fc9a5f33edaef6566d878dd39bafe284ab7dd8faa7190ff1ca8db4eff2691  run-hang-interrupted-0.json
e1d5f93c6ab06c5dd6f15988d4f07fc295d1136cce7eab58968dc4b20f7636c5  run-import-fails-0.json
37262cd01d7bc0e5f4128899d46a87fc8450bdc32203a9db8441aedc3176beb2  run-import-fails-no-errors-check-0.json
dddad5230e852acf352068dacf8e36cfa81eaca5c90ee884d4de86b61e52486f  run-import-fails-no-errors-check-fc-0.json
ddc3eaa21afafd17570af751849512b5dc5a6bce9664c61da04882433fcb7421  run-it-concurrent-skip-0.json
9b145419147430eb2f0f4cc78f3d76052be4709de3bea6fcc4a32217c4408ebf  run-it-only-0.json
74847c31d2b92585172c62c0ffa0acc6637fae6262290e9a49a52dd8a5780801  run-it-only-ci-0.json
431479aa67b4751a59c2462fc9d809950b731f3428f2d47ba99e180e9379f30e  run-it-only-credentials-0.json
96884afa0ae045f4dd685d03f18c4b26c72bb35f47121310810a747af675f396  run-it-only-credentials-ci-0.json
ac950fcbdf5aeec8bffd01fd9f202c07b2bc3f801cab8807723122187c2d2574  run-it-runIf-false-0.json
d41d4c4db84e91d34f0fe8a10ca559b8b74035219c17425a5a7c1013e3f80f9c  run-it-skip-0.json
6f8dc2eb649aa8b08de9af5194cbf5285d58e95f6a1e0cb31a2d269ef4d4a944  run-it-todo-0.json
9c21577cb09b0c8d6102e9b7a55efb9b2085afb3923bf9e7d800888d1a47c0fc  run-lifeline-control-0.json
ce9924c30f7f38718374784e0a4130d6613205544cf51431c2bcfd3397f2d975  run-lifeline-hang-0.json
1fa6d01291422ae1124116d1a0426c36c428572dd6055ee8f743d352f834bd2a  run-lifeline-hang-interrupted-0.json
b65175c9ce2c1a6d32c983f0fd6cb99d284bc732c70ec51a07b4d37d0381203a  run-main-merge-fc-0.json
ad5f89dda25fc46f4e9b0a0f8eb3ceea2e6d7c758842b0530cb590c2d2e1c276  run-main-merge-full-0.json
861bfc04b23a5a822c0659d1f7279a25063d333ec1263769e85c2b5ea5da18ba  run-main-merge-shim-0.json
dbe122fed5a5e1c5f7c8f9e46f5e7e598687131ccde569ad149ef49116229546  run-noshim-merged-0.json
0fd1b53dda0a40cb72d9dcdd43af3435dd705ef49644a8db18fc818ff5426742  run-real-merge-fc-0.json
6f99957b3688997c9f98792d93072b5aa9d4f25a2f9512186e880aa2d361c846  run-real-merge-full-0.json
02a1aac6d624bafd1080e2c2d44f5b251778bd2ded97ab4f3258a1ccc02c3c72  run-real-merge-shim-0.json
6672b72c4e420bc0d755779a95f5dbd38b8319666e22ce239113d44796cec9b0  run-runtime-ctx-skip-0.json
a6fbf8a17cc614a6833e92f245b9f1e841d6fa78e94f8b7dcf21849912a94467  run-shim-merged-0.json
88c52b952a2a53fc5817ccd5a46dc582d416c300bdef043a9be5124f8ff0c40d  run-shim-subject-0.json
5b77af26ce1dd772fe102b599e1cd224a1791989b5eb75cc3444a02c0bdfc5ac  run-skipIf-process-0.json
04b5bace086f725ba690b33fd573296e3bb10e62eeb492b594fc5d6ee9b5951f  run-state-renamed-fc-0.json
77eff22968ad18aad5644d16b201dc726e6ee4cd0a703103ec76e008b2e1cedc  run-state-renamed-fc-S1-0.json
d05f7f89a19979bf3e96812ec1cb905b6cbd20cdb5fa7f6c7951a208da61c53a  run-test-skip-0.json
78a710bc3bd423028812cd415004201acae307155c14fb5e499aeb6d5399e840  run-vacuous-census-fc-0.json
8e264f78707e4e3be93c2d3c69445fd78a92da594ed74177eb39775f1a9d802c  run-vacuous-census-fc-no-self-check-0.json
```
