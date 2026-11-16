# R-GP-IMPL-TEST-TIMEOUTS-2 — CC-REV-1 implementation review of syzygy-bpyt.4.31, round 2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: e54f65c6
Subject: r2-review.diff sha256 f618b42b872bdf88d6dbbeced4e126c3a3ed2d07674408bfbeb6c025087c4fc5

Reviewer: an independent fresh-context agent. I did not write this change, did not review round 1, and did not edit
the change. Brief: `scratchpad/lead/b431/brief-r2.md`. Reviewed 2026-10-27. Paths that are not repository paths are
relative to `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-537b/`
("rev-537b/").

This round judges the repair of round 1's F1, F2 and N1–N12, and nothing round 1 already cleared.

No blocking finding, four notes:

- **N1** — the dossier hook's exceedance is cited at `docs/reviews/R-GP-IMPL-TEST-TIMEOUTS-1-RAW.md`, a path that does
  not exist at `e54f65c6`. Landing must add that raw, verbatim, in the same merge.
- **N2** — `check_removals.py --later` keeps only the last row per site, and silently ignores a row that names no
  removal. Two of my mutants survive the tool; no live instance.
- **N3** — `citation_audit.py` identifies a file by its basename, and a test only by its title. My mutants R2 and R4
  survive; no live instance.
- **N4** — `later-observations.json` says a script copied it, but no such script is retained. I checked its literals
  myself, and they hold.

F1 and F2 are repaired. N1, N3, N9, N10 and N12 do what the lane says.

## 1. Subject identity checks

All [Observed], by script.

- `git diff f44cd65d e54f65c6 > r2-review.diff`, then `sha256sum` printed
  `f618b42b872bdf88d6dbbeced4e126c3a3ed2d07674408bfbeb6c025087c4fc5`. **Matches.**
  - `git diff --binary f44cd65d e54f65c6 | sha256sum`, the form the lane names, gives the same value.
- `git diff f44cd65d e54f65c6 -- apps packages | sha256sum` printed
  `013799e1942d8b52c37fb2d617fab5d39d03b3b99cbdb19e6555b22621ecf1de`. **Matches.**
- `--shortstat`: `24 files changed, 4613 insertions(+), 155 deletions(-)`. Under `apps packages`:
  `2 files changed, 2 insertions(+), 2 deletions(-)`. The two code files are the brief's two. The other 22 are under
  `docs/evidence/syzygy-bpyt-4-31/`: 15 modified (9 JSON records and 6 tools) and 7 added (6 JSON records and 1 tool).
- Commits: `git log --oneline f44cd65d..e54f65c6` lists `a957c8e9`, `d627a6b4` and `e54f65c6`.
  `git diff --quiet d627a6b4 e54f65c6 -- apps packages vitest.config.ts vitest.setup.ts` succeeded. So the reviewed
  commit's code is `d627a6b4`'s, which is the commit the lane's head records name.
- **Main** is `973965a82f82d9b90af05e4b96524aae0d9dbec4` (`gh/main` after fetch). It is 97 commits past the merge base
  `f7477f52`.
  - `comm -12` of main's 587 changed files and the PR's 123 gives **4** files (`overlap.txt`):
    - `polaris-accessible-names.browser.test.ts`, `surface-routes.test.ts` and `tuple-encoding.test.ts`. In each, the
      only change is the import line `'@syzygy/cap1-daemon'` → `'@syzygy/http-host'` (`main-import-lines.txt`).
    - `package-reader.test.ts`: one hunk, `@@ -144,6 +144,36 @@`, with 0 removed lines. It is 30 lines added after
      line 146.
  - The lane's claim holds.
  - A local `git merge --no-ff 973965a8` onto `e54f65c6` made `3b154b32` with no conflict, and `git status --porcelain`
    printed 0 lines (`merge.log`).
- **Kept-site lines on the merge** (`merge-census-compare.txt`, the lane's census run at `3b154b32`):
  - All 92 head sites are present on the merge, matched by (path, kind, callee, title, suites, expression), with no
    duplicate key.
  - **77 of 92** keep their line number.
  - **15 of 92** move down 30 lines. They are every site in `package-reader.test.ts` after line 146: 259→289, 327→357,
    368→398, 375→405, 381→411, 443→473, 498→528, 541→571, 563→593, 581→611, 710→740, 779→809, 804→834, 947→977 and
    1061→1091.
  - 0 sites differ in reason text or citations.

  So after landing, those 15 line numbers in `census-head.json` and `citation-audit.json` name lines 30 above the
  merged sites. Each record names the commit its lines count at (`d627a6b4`), so the records stay correct.
- **Hosted CI.** `gh pr checks 537 -R Tzeusy/syzygy` printed:
  ```
  checks	pass	20m6s	https://github.com/Tzeusy/syzygy/actions/runs/40492973678/job/122151232218
  node	pass	2m54s	https://github.com/Tzeusy/syzygy/actions/runs/40492973612/job/122151231655
  ```
  `gh run view` gives `"headSha":"e54f65c654e59a9c52c848b8e633e9a4ef4942f0"`, `"event":"pull_request"` and
  `"conclusion":"success"` for both runs (`hosted-runs.txt`). `gh pr view` printed
  `e54f65c654e59a9c52c848b8e633e9a4ef4942f0 OPEN MERGEABLE`.

## 2. Clauses relied on, and the class ruling

**CC-REV-1**, in `.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at `e54f65c6`:

- Lines 18–20: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the
  agent performing the change never finally decides which classes it touches."
- Line 37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;". Classes 1–7 are on lines 31–43.
- Line 45: "**Class membership is contested by default and is never finally determined**".
- Lines 49–50: "**The change record states** which classes the change touches, or "none," so a misclassification is a
  findable violation after the fact."
- Line 51: "**A reviewer or the owner** may reclassify at any time."

**GP-Q0**, in `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md` at `e54f65c6`:

- Line 51: "Behavior-preserving refactors may proceed under the acts already in force. They may touch `apps/**`,
  `packages/**`, `scripts/**`, tests, CI and root manifests."
- Lines 52–55: ""Behavior-preserving" means none of the following changes: a rendered byte, a wire format, a refusal
  string or an exit code; a signed or digest-bound artifact; a consent, security or retention decision."
- Line 60: "Each pull request states which CC-REV-1 classes it touches."

**Test-rigor bar**, in `git show e54f65c6:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`:

- Lines 78–81: "6. **Deterministic or quarantined** — A test that fails intermittently is worse than no test: it trains
  people to ignore red. Fix the nondeterminism (time, ordering, shared state) or delete the test; never
  retry-until-green."
- Lines 93–96: "10. **Growth is governed** — … Reviews state the net test delta; adds-only growth in a mature area is a
  finding".

**AGENTS.md verification rules** I applied: 2 and 9 (every count has its denominator), 3 (every digest was computed),
4 (I read each output, not only its exit code), 6 (§3.4, §3.5, §3.6), 7 (I worked in a fresh clone), 10 (every figure
is bound to its commit) and 11 (§3.9).

**Class ruling: none.** The facts are [Observed]; the ruling is [Inferred].

- **What changed in code.** The repair delta touches 2 code files, both tests.
  - `dossier-cap-measure.test.ts`: the `, 120_000` argument comes back, plus a trailing comment. Its comment-free token
    stream equals the base `f7477f52`'s: `tokens 238 238 IDENTICAL`.
  - `production-reobserve.test.ts`: a trailing comment only. Its stream equals both `f7477f52`'s and `f44cd65d`'s:
    `tokens 1736 1736 IDENTICAL` (`token-check.txt`, `tools/token_equal.mjs`).
  - Everything else is under `docs/evidence/`.
- **Classes 1–3 and 5–7.** No write-universe, identity, snapshot, evaluation, schema, store, endpoint, adapter or
  certificate code changed.
- **Class 4.** No egress path, auth surface or SEC-scoped code changed. The `no-egress.test.ts` site that round 1
  discussed is not in this delta.
- **GP-Q0, item by item.**
  - No product code changed, so no rendered byte, wire format, refusal string or product exit code changes.
  - No digest-bound artifact changes (`digest-bound-sweep.txt`). The pre-image sha256 and blob id of the 17 modified
    files are 34 tokens. Over 5,019 tracked files, they are cited only by records under
    `docs/evidence/syzygy-bpyt-4-31/`, and **0** citers are under `.syzygy/` or `openspec/`.
  - No consent, security or retention decision changes.
  - No gate code changes, so **nothing a gate accepts or refuses changes**.
  - The repair restores one test runner budget and adds two comments. Under GP-Q0's own list, it is
    behaviour-preserving.

## 3. What I ran, and the results

Host: 12 logical CPUs. My clone is
`git clone /home/tze/GitHub/syzygy`, with GitHub added as a remote, `main` and the branch fetched, and `e54f65c6`
checked out. `npm ci` exited 0 there (`npm-ci.log`) and in a `base` worktree at `f7477f52` (`npm-ci-base.log`). A
`merge` worktree held `3b154b32`. Each vitest process ran alone, with a private TMPDIR (`/tmp/r537b-1` … `-4`).

Load1 across my timed runs was 19.39–33.59: lower than round 1's 22–63 and the lane's full runs at 38–71. A pass at
this load is weaker evidence than a pass under heavier load; §3.10 says what that limits.

### 3.1 F1: `dossier-cap-measure.test.ts:12`

- **Base value, byte for byte.** [Observed] The line at `f7477f52` is `'}, 120_000);'`. The head line starts with
  exactly that string, and the rest starts with `" //"`. The file's comment-free tokens equal the base's (§2). The
  removal had made `f44cd65d` differ at token 94: `["28:,","9:120_000","22:)"]` against `["22:)",…]`. The repair
  undoes exactly that.
- **The reason** (one line) says: "builds a git fixture and runs dossier discovery over it: up to 1.1 s in 5 alone
  runs at load1 22-24 (docs/evidence/syzygy-bpyt-4-31/repair-durations/dossier-cap-measure.test.hooks.json), but 5.1 s,
  past half the 10 s hook default, in one review run at load1 46-55 (docs/reviews/R-GP-IMPL-TEST-TIMEOUTS-1-RAW.md
  §3.4)".
  - **The first citation reproduces** (`f1-check.txt`). The record's subject is `a957c8e9`'s file, sha256 `f3168eef…`,
    which I recomputed. Its 5 runs give file-level `beforeAllMs` 524, 630, 762, 1081 and 874, all exit 0. Load1 runs
    22.01–23.75. So "up to 1.1 s … 22-24" holds.
  - **The second citation is not in the tree at `e54f65c6`.** The coordinator's plan is to retain the round-1 raw at
    that path at landing. The raw at
    `scratchpad/rev-537/R-GP-IMPL-TEST-TIMEOUTS-1-RAW.md` hashes to
    `0ca96c9a5c8b8701f7c21605f21b113976aebab61ec0548280be419a7dbb55cf`. That is the digest `later-observations.json`
    records. Its §3.4 holds `"hookMs": 5107`, `Hook timed out in 5000ms.` and load1 `46.40 54.89` (`later-literals.txt`).
  - The census and the audit cannot see the second citation. The census counts only a commit or an existing
    `docs/evidence/` path as a citation, so the site's audited citation is the first one alone: `"measured": "file"`,
    a record whose worst is under the threshold. See N1.
- **`check_removals.py` with `--later`**, re-run on the retained inputs:
  - It printed `48 of 58 removals hold`. The output is byte-identical to the retained `removal-check.json`.
  - The dossier row: alone holds (worst 933, 5 observations); full holds (bounds 1750, 1751, 3313, 2899, 3169); later
    `"holds": false, "worstMs": 5107`. So it is refused for the right reason, and by `later` alone.
- **Without `--later`** it printed `49 of 58 removals hold`, and the dossier site holds.
- **Dropping the observation** (`tools/later_mutants.py`, `later-mutants.json`). Each mutant runs the lane's tool on a
  mutated copy of `later-observations.json`, then compares my census's absent set at the head with the holding set:

  | Id | Mutant | Dossier | Holding | Head absent = holding |
  |---|---|---|---|---|
  | L0 | unmutated | refuses | 48 | true |
  | L1 | row dropped | accepts | 49 | **false**: `holdingNotAbsent` names the dossier site |
  | L2 | `worstMs` 5000, at the threshold | accepts | 49 | false |
  | L3 | `worstMs` 5001 | refuses | 48 | true |
  | L4 | site key names line 13, which is no removal | accepts | 49 | false |
  | L5 | a second row for the site, `worstMs` 100, appended | accepts | 49 | false |

  - The tool exits 0 in every case. Its docstring says it "decides nothing else", so the refusal shows as a verdict
    row, and a dropped observation fails the head-versus-holding comparison, not the tool's exit code.
  - L1 and L2 behave as the rule says.
  - **L4 and L5 are defects the tool does not catch** (N2).
- **The lane's own mutants.** `check_removals_mutants.py` printed `10 of 10 killed, 3 of 3 controls held`. Its output
  equals the retained `removal-check-mutants.json`, except for the run commit.
- **My 5 runs of the file at the head** (`runs/files/`, `runs/files-head-summary.txt`): all exit 0, at load1
  19.39–21.37. File-level `hookMs` was 771, 593, 784, 587 and 658. In the full suite (§3.6) it was 2115, at load1
  20.09–33.59.

### 3.2 F2: `production-reobserve.test.ts:160`

- **Value.** The site stays `}, PRODUCTION_BUILD_TIMEOUT_MS);`, and `const PRODUCTION_BUILD_TIMEOUT_MS = 60_000;` is the
  same at `f7477f52`, `f44cd65d` and `e54f65c6`. The file's comment-free tokens are identical to the base's. Not
  resized (ruling 5).
- **The reason's two citations measure this test by name** (`f2-check.txt`):
  - **`full-runs.json`.** The 5 runs at `1785a905` list `production-owned capture-to-model re-observation seam >
    re-evaluates an unchanged repository twice: two distinct named identities, the first result unchanged
    (syzygy-u05.2)`. Its figures are 3929, 1908, 5092, 8477 and 6681 ms, each `✓`, at load1 38.16–70.62. The
    reason's "up to 8.5 s … load1 38-71, over the 5 s default in 3 of them" holds: 5092, 8477 and 6681.
  - **`repair-durations/production-reobserve.test.tests.json`.** The record's subject is `a957c8e9`'s file, sha256
    `e5f84517…`, which I recomputed. Its 5 runs give the test 1569, 979, 1154, 1168 and 1100 ms, all `passed`, at load1
    22.07–23.63. So "up to 1.6 s … 22-24" holds.
  - **The audit agrees.** Its row for `:160` is `"measured": "test"` on both citations: `"duration": {"ms": 3929}`
    and `{"durationMs": 1569}`. Ruling 6 is met.
- **Keeping it is right.** The coordinator's removal condition was a worst at or under 2500 ms, and this test's worst
  is 8477 ms. In my full run it took 4429 ms at load1 20–34 (§3.6). On the five alone runs I made it took 986–1294 ms.
- **The residual count, by a second method.** `tools/title_presence.py` (`title-presence.txt`) checks, for every kept
  titled test outside the deferred files, whether a cited JSON record carries its title:
  - 52 sites have a record that carries the title;
  - 6 cite only a commit. 4 are commit readings the audit counts by test (`fixture-directories:294`, `gate-acts:98`
    and `:106`, `start-gates:1015`), and 2 are the residuals (`opening-index:424`, `live:139`);
  - 3 carry neither, and each is a hand reading the audit names: `pipeline-demo:73` by its `-t` filter, and
    `surface-routes:420` and `:453` by the BUL case labels.

  52 + 4 + 3 = 59 titled tests measured by test name. Add the `package-reader` hook the audit counts by its commit
  reading, and that is 60. **Residuals: 2.** That equals `"measuredByTest": 60, "measuredByFileOnly": 13` and the two
  residuals.

### 3.3 The census, by my own method

Tool: `tools/my_census.mjs`. I wrote it fresh for this round, and it shares no code with the lane's
`timeout_census.mjs` or round 1's `rev_census.mjs`. It differs in how it finds callees: it starts from the names
imported from `'vitest'`, plus undeclared vitest globals.

**Predicate** (in full in its header):

- **Population:** every blob under `apps/` or `packages/` ending `.ts .tsx .mts .cts .js .mjs .cjs`, excluding
  `.d.ts`, `dist/` and `node_modules/`, plus every root-level file with one of those extensions.
- **Bound names:** a name is bound to a vitest API when it is a named import from `'vitest'` (renames followed), or an
  undeclared global `it test describe suite beforeAll afterAll beforeEach afterEach`. A `const`/`let`/`var` is bound
  when its initializer's roots reach a bound name, through parentheses, property access, element access, calls, `?:`,
  `||`, `??` and `&&`. Binding is repeated to a fixed point.
- **Sites:**
  - a test or suite with an object-literal argument that has `timeout`, or with ≥3 arguments whose last is neither a
    function literal nor an object literal;
  - a hook's second argument;
  - each `testTimeout`/`hookTimeout`/`teardownTimeout` property inside `vi.setConfig(...)`;
  - any other such property, counted as config.

Results [Observed]:

| Commit | Population | Sites | test / hook / suite / config | Files |
|---|---|---|---|---|
| `f7477f52` (merge base) | 514 | 140 | 118 / 19 / 1 / 2 | 41 |
| `546f1ff0` (lane's base) | 508 | 140 | 118 / 19 / 1 / 2 | 41 |
| `f44cd65d` (round 1) | 514 | 91 | 77 / 11 / 1 / 2 | 33 |
| **`e54f65c6` (reviewed)** | 514 | **92** | 77 / 12 / 1 / 2 | 34 |
| `973965a8` (main) | 516 | 140 | 118 / 19 / 1 / 2 | 41 |
| `3b154b32` (local merge) | 516 | 92 | 77 / 12 / 1 / 2 | 34 |

- **Against the lane's census** by (path, line, kind) (`census-compare.txt`):
  - at `e54f65c6`: `mine 92 lane 92 both 92`, with no site in only one of them;
  - at `546f1ff0`: `mine 140 lane 140 both 140`, likewise.
- **From `f44cd65d` to `e54f65c6`**, the only change is one added site, `dossier-cap-measure.test.ts` line 12, a hook.
- **Base to head, site by site** (`tools/match_sites.py`, `match-546-e54.json`). Lines were mapped by difflib opcodes
  over each file's two blobs, and each site anchored at its call line. `546f1ff0` → `e54f65c6`:

  ```
  baseSites 140  headSites 92  workable 123  keptWorkable 75  absentWorkable 48  deferredKept 17
  unmatchedHead []  absentEqualsHolding True  absentNotHolding []  holdingNotAbsent []
  ambiguous 0 keptExprChanged 0 keptBelowDefault 0
  ```

  So **48 absent**, exactly `removal-check.json`'s holding set, and **75 kept**, each with an unchanged expression.
  The same run on the merge `3b154b32` prints the same figures (`match-546-merge.json`).
- **Ruling 5.** Of the 92 kept sites, 0 changed their expression text or their resolved value.
- **Ruling 3.** 0 of the 71 kept workable sites my census evaluates is below its default. I evaluated the other 4 by
  hand (`unevaluated-consts.txt`):
  - three hooks use `SHARED_FIXTURE_TIMEOUT_MS = 60_000` (`test-model-fixture.ts:248`);
  - `pipeline-demo:73` uses `ONRAMP_TEST_BUDGET_MS`, the sum of `{ clone: 30_000, refusedRun: 30_000, install:
    120_000, documented: 270_000 }`, which is 450000.

  Both files are unchanged from base to head. So **0 of 75** kept workable sites is below its default.
- **The lane's census, re-run** at `d627a6b4`, is byte-identical to the retained `census-head.json`. Its summary:
  `"sites":92,"files":34,"withoutReason":6,…,"withoutCitation":17`.
- **The collected-test view** (`relane/collect-timeouts.json`). `collect_timeouts.py`, re-run with my `base` worktree
  against the clone at `e54f65c6`, printed `base 5411 tests, head 5411; 5359 unchanged, 43 changed, 0 only at base, 0
  only at head`. It equals the retained `collect-timeouts.json` in every field but the head commit (`d627a6b4` there,
  `e54f65c6` here, with the same code). The 43 are `(30000, 5000)` ×37 and `(60000, 5000)` ×6. None is in
  `production-reobserve` or `dossier-cap-measure`.

### 3.4 The audit tool

- **Re-run.** `citation_audit.py . census-head.json decisions-546f1ff0.json OUT --mutants` printed:

  ```
  {"sites": 75, "citations": 78, "measuredByTest": 60, "measuredByFileOnly": 13, "residuals": ["apps/three-surface-poc/src/polaris-opening-index.browser.test.ts:424", "packages/three-surface-poc-core/src/test-artifact-verification.live.test.ts:139"]}
  {"A1": "killed", "A2": "killed", "A3": "killed", "A4": "killed", "A5": "killed", "A6": "killed", "A7": "killed", "A12": "killed", "A13": "killed", "A8": "killed", "A9": "killed", "A10": "killed", "A11": "killed"}
  ```

  - The output is byte-identical to the retained `citation-audit.json`.
  - By site kind and verdict: test/test 59, hook/test 1, hook/file 10, suite/file 1, config/file 2, test/None 2.
  - **0 titled tests are measured by file.**
- **On the merge's census** the audit prints the same first line (`relane/merge-citation-audit.out`).
- **The k66p hand readings** (stem keys). The lane says each stem is the one test file with that name. That holds:
  `polaris-first-reading`, `polaris-narrative` and `tuple-encoding` each name exactly one tracked `*.test.ts`.
- **My mutants of the new file-match predicate** (`tools/audit_mutants.py`, `audit-mutants.json`). Each loads the
  lane's `citation_audit.py` as a module, unedited, rewrites every string and key of one cited record, and audits the
  site with the lane's own `audit_site()`:

  | Id | Mutant | Site | Before → after | Outcome |
  |---|---|---|---|---|
  | R1 | **stem**: every full path and file name cut to `polaris-copy` | `polaris-copy:226` (hook) | file → None | **killed** |
  | R2 | **same basename, other file**: every name rewritten to `packages/elsewhere/src/polaris-copy.test.ts` | `polaris-copy:226` (hook) | file → file | **SURVIVED** |
  | R3 | **titled test by file**: the title replaced in both records, the file left | `production-reobserve:160` | test → None, with `"refused": "names only the site's file, …"` | **killed** |
  | R4 | **same title, other file of the same basename** | `production-reobserve:160` | test → test | **SURVIVED** |
  | C1 | control: the site's own full path | `polaris-copy:226` | file → file | held |

  - **R2.** The evidence after the mutant is `"name": "packages/elsewhere/src/polaris-copy.test.ts > classifies each
    interpolated …", "duration": 803`. The tool's header defines a file match as "the site's full path or its file
    name as a whole token", and a basename under another directory meets that definition. Round 1's N4 offered "full
    path, or basename equality", so the repair meets N4 as written.
  - **R4.** A test match reads only the title, so a same-titled test in another file passes.
  - **Live instances: none.** [Observed]
    - Over 255 tracked test files, 4 basenames are shared: `cli.test.ts`, `git-object-reader.test.ts`,
      `package.test.ts` and `pipeline.test.ts`. None of the 13 file-measured sites is in one of them, and none of their
      evidence strings names its basename under another directory (`basename-sweep.txt`).
    - Of the 59 titled tests measured by test name, 58 have their longest literal title fragment in their own file
      only (`title-collision-sweep.txt`). The 59th, `fresh-clone.system:117`, also appears in
      `skipped-population.system.test.ts:23`, as a string that refers to that same test. It is not a test of its own.

  See N3.

### 3.5 The notes' repairs, re-run

- **N1** (`census_mutants.py`).
  - It printed `21 of 21 killed`. Its output equals the retained record, except for the run commit.
  - M8 is now `"old": "node.expression.name.text === 'setConfig'"` → `'setConfigX'`. Its output is
    `selftest FAILED:\n  missing ["packages/x/src/a.test.ts",17,"setConfig","testTimeout",6000,null,0,0]`.
  - **Rule-6 probe of the new error rule.** I ran a copy of the suite with M8 put back to round 1's deleting fragment.
    It printed `M8 error: vi.setConfig` and `20 of 21 killed`, and exited 1 (`relane/census-mutants-oldM8.out`). The
    copy was removed after. So a SyntaxError is counted as an error, never a kill, and it fails the suite. **Repaired.**
- **N3** (`decide_mutants.py`). It printed
  `{"D1": "killed", "D1c": "holds", "D2": "killed", "D2c": "holds", "D3": "killed", "D4": "killed", "T1": "killed", "T2": "killed", "T3": "killed"}`,
  equal to the retained record except for the run commit.
  - T1 is killed on `fixture-directories:296` (`"siteWorstMs": 2559`): keep → remove.
  - T2 is killed on input D4, with `governing-intent-sweep:168` at 7500 ms.
  - T3 is killed on `surface-routes:313`: keep on "a hosted run's hooks together took over the threshold (at least
    8973 ms)" → remove.
  - `decide.py` still reproduces `decisions-546f1ff0.json` byte for byte. **Repaired.**
- **N9** (`n9-check.txt`).
  - `repair-durations/cap1-system.hooks.json` is 5 runs at `d627a6b4` (tree `cd57c71b…`, which I recomputed). Each has
    `exitCode` 0, `unhandledErrors: []` and 49 of 49 tests passed, at load1 22.56–42.93.
  - `repair-durations/cap1-system-exit-probe-546f1ff0.json` (tree `61e51318…`, which I recomputed):
    - its `loopLog` reads `['run 1 exit 0', 'run 2 exit 1']`;
    - run 2's log holds `Error: [vitest-worker]: Timeout calling "onTaskUpdate"`, ` Tests  49 passed (49)` and
      `Errors  1 error`;
    - both runs' `logSha256` reproduce from their `log` fields.
  - The base record's exit codes are still `[1, 1, 1, 0, 1]`, and its per-run causes are stated as [Unknown].
    **Repaired.**
- **N10.** `cited.json` gains `"linesAt": "546f1ff066e2ffef749c757cdb4621336039113b"`, and its `text` says that site
  keys count at it. **Repaired.**
- **N12.** `check_host_stubs.py --mutants`, with OUT at the record's own path, printed `55 of 55 stubs agree with
  host.json over 75 JSON files; disagreeing: []; other host shapes: 0; mutants ['H1 killed', 'H2 killed']`. The output
  is byte-identical to the retained `host-stubs.json`. (With OUT outside the directory it reads 76 files, because the
  retained `host-stubs.json` is then counted too.) **Repaired.**

### 3.6 The full vitest suite, once, at `e54f65c6`

`npx vitest run --reporter=default --reporter=tools/r2_reporter.mjs`, run alone in the clone, with
`TMPDIR=/tmp/r537b-2`. Load1 was 20.09 at the start and 33.59 at the end. The tail of `runs/full/full.log`:

```
 Test Files  242 passed | 3 skipped (245)
      Tests  5357 passed | 5 skipped (5362)
   Duration  254.03s (transform 26.07s, setup 5.42s, collect 129.95s, tests 963.84s, environment 92ms, prepare 53.39s)
```

- `exit 0`, and the reporter counted 0 unhandled errors. This equals the lane's local figures.
- The 5362 are the root projects. The system tier's 49 bring them to the 5411 of §3.3.
- **The 48 removals, in this run** (`runs/full/removals-in-full.txt`):
  - 0 of the 48 holding removals is over its threshold.
  - 47 were matched by script. The 48th, `opening-index:364`, has a template-literal title; I matched it by hand at
    750 ms and 489 ms.
  - The worst removed test is `opening-index:408` at 797 ms. The worst removed hook is `accessible-names:187` at
    2594 ms.

### 3.7 The two repaired files, 5 rounds each, at `e54f65c6`

Tool: `tools/run_files.py`, with rounds as the outer loop and `TMPDIR=/tmp/r537b-1`. All 10 runs exited 0, at load1
19.39–21.37, with 0 unhandled errors. The figures are in §3.1 and §3.2.

### 3.8 Repository checks at `e54f65c6`, in the clone

- `npm run typecheck`: `typecheck exit 0` (`typecheck.log`).
- `python3 scripts/check_governance.py`: exit 0, `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`
  (`check_governance.log`).
- `python3 scripts/check_quotations.py`: exit 0, `OK    QC-1  a quotation beside a path:line locator was said by that
  file — 37 quotations examined in 18 of 952 .md files scanned … 0 findings` (`check_quotations.log`).
- **On the merge `3b154b32`:**
  - the lane's census gives `"sites":92,"files":34,"withoutReason":6,…,"withoutCitation":17`;
  - `check_removals.py --later` prints `48 of 58 removals hold`, byte-identical to the retained record;
  - without `--later` it prints `49 of 58`;
  - the audit's figures are unchanged.

### 3.9 Rule 11, over the 15 new or regenerated JSON records

Every digest below was recomputed by script and matches (`rule11-digests.txt`):

| Record | Subject named | Digest named |
|---|---|---|
| `census-head.json` | commit `d627a6b4` | tool sha256 `6e503285…` ✓ |
| `census-mutants.json` | tool path and commit | tool sha256 ✓ |
| `citation-audit.json` | census commit `d627a6b4` | none of its own. It re-runs byte-identical |
| `cited.json` | `linesAt` `546f1ff0` | (a hand input) |
| `collect-timeouts.json` | base and head commits | tool sha256 `bd42de96…` ✓ |
| `decide-mutants.json` | commit | decide.py `aab52842…` ✓ and input sha256s |
| `host-stubs.json` | `headAtRun` | tool `694e218a…` ✓, and each record's sha256 |
| `host.json` | `recordedAtCommit` | (the host) |
| `later-observations.json` | the f44cd65d file | file `48658861…` ✓ and the raw's `0ca96c9a…` ✓. No extractor (N4) |
| `removal-check-mutants.json` | commit | tool `e12d1f5b…` ✓, inputs including later-observations `0950a337…` ✓ |
| `removal-check.json` | base `546f1ff0` and the head-record commit | **no digest for its inputs, including the new `--later` file** (N2) |
| `repair-durations/cap1-system-exit-probe-546f1ff0.json` | commit and tree | tree `61e51318…` ✓ |
| `repair-durations/cap1-system.hooks.json` | commit and tree | tree `cd57c71b…` ✓, script `713dbfdb…` ✓ |
| `repair-durations/dossier-cap-measure.test.hooks.json` | `a957c8e9` file | file `f3168eef…` ✓, script `f5a73f9d…` ✓ |
| `repair-durations/production-reobserve.test.tests.json` | `a957c8e9` file and testkit | file `e5f84517…` ✓, testkit `3576a99d…` ✓, script `7799aa73…` ✓ |

Every new or regenerated record names its subject commit. Each one that measured bytes names the digest of what it
measured, with the two gaps given in N2 and N4.

### 3.10 Limits and process disclosures

- **Load.** Load1 was 19–34 in my runs. I did not reproduce round 1's 46–55 stall, and could not. Both repaired sites
  are kept, so the load limit bears only on my full-suite pass. That pass is the same as the lane's local pass and the
  hosted `node` pass.
- **The old record.** I did not regenerate `decisions-546f1ff0.json`'s row for `:160`. It still reads
  `"basis": "its reason already cites a measurement: docs/evidence/poc-test-timeouts-2026-10-03.json"`. The PR body
  says so ("left its decision alone"). It is a base-state record, and `decide.py` reproduces it.
- **Read-only calls outside my clone.** I ran `bd show syzygy-bpyt.4.41 --json` and `git remote get-url` in
  `/home/tze/GitHub/syzygy`. Both are read-only. The bead exists: "Timeout census: five uncensused forms; re-measure
  three near-threshold hooks (PR 537 R1 N2, N7)".
- **A file the harness wrote.** One of my commands printed too much output, and the harness saved it to a file under
  `~/.claude/projects/…/tool-results/`. I did not read that file, and I re-ran the command with bounded output. I read
  nothing under `~/.claude/` or `~/.config/`.
- No push, PR comment, merge or `bd` mutation.

## 4. Findings

There is no blocking finding. Four notes follow, each written to be acted on cold.

### N1 — the dossier hook's exceedance citation names a path absent at the reviewed commit

- **Severity:** note, and a landing condition.
- **Evidence** [Observed]:
  - `apps/three-surface-poc/src/polaris-generation/dossier-cap-measure.test.ts:12`'s reason cites
    `docs/reviews/R-GP-IMPL-TEST-TIMEOUTS-1-RAW.md §3.4`, which does not exist at `e54f65c6`.
  - `later-observations.json` (`rows[0].source`) and `removal-check.json` (the dossier row's `later.source`) name the
    same path, with sha256 `0ca96c9a…`.
  - The census's citation predicate does not see it, so the site is audited on
    `repair-durations/dossier-cap-measure.test.hooks.json` alone, whose worst is 1081 ms. In-tree, the exceedance is
    held only by `later-observations.json`, which the reason does not cite.
- **Failure scenario:** the raw does not land, or lands with other bytes. The reason then cites nothing for the 5.1 s
  that justifies keeping the site, and `later-observations.json` names a digest no tracked file has. The audit would
  still report the site as measured, on a record that by itself argues for removal.
- **Proposed fix:**
  - At landing, commit `scratchpad/rev-537/R-GP-IMPL-TEST-TIMEOUTS-1-RAW.md` verbatim at
    `docs/reviews/R-GP-IMPL-TEST-TIMEOUTS-1-RAW.md`, in the same merge or earlier, and check that it hashes to
    `0ca96c9a5c8b8701f7c21605f21b113976aebab61ec0548280be419a7dbb55cf`.
  - The partition pattern `R-GP-IMPL-.*-RAW\.md` already exists (`scripts/check_docs_review_campaign_partition.py:445`
    on main). The "Greenfield-parity implementation" row of `docs/README.md` counts 59 at `973965a8`, so bump it with
    the raw, and re-run `check_docs_review_campaign_partition.py` after rebasing.
  - Optionally, in a follow-up, add `docs/evidence/syzygy-bpyt-4-31/later-observations.json` to the reason's
    citations, so the in-tree carrier is cited and audited.

### N2 — `check_removals.py --later` keeps the last row per site and ignores a row that names no removal

- **Severity:** note. It is latent: `later-observations.json` has 1 row, and it names a decided removal.
- **Evidence** [Observed], §3.1:
  - `later = {r['site']: r for r in …['rows']}` keeps the last row per site. My L5 appends a second, lower row
    (`worstMs` 100), and the refused removal then holds: 49 of 58.
  - A row whose `site` is not a decided removal is dropped silently. My L4 changes the key from `:12` to `:13`; the
    removal then holds, and the tool still lists the stray key under `later.sites` and exits 0.
  - `removal-check.json` names `later.path` but no sha256 of that input, or of any other input. Only
    `removal-check-mutants.json` records them.
- **Failure scenario:** a later re-measurement appended below an exceedance, or keyed at a line from another commit,
  quietly lifts a refusal. The head census and the holding set then disagree, but only a separate comparison shows
  it.
- **Proposed fix**, in `docs/evidence/syzygy-bpyt-4-31/tools/check_removals.py`:
  - group the rows by site and take the maximum `worstMs`;
  - exit 1 when a `later` row's site is not a decided removal of DECISIONS.json;
  - write each input's sha256 into OUT.json;
  - add L4 and L5 to `check_removals_mutants.py` as killed mutants;
  - regenerate both records.

### N3 — `citation_audit.py` identifies a file by its basename, and a test by its title only

- **Severity:** note. It is latent: 0 of 13 file-measured sites, and 0 of 59 test-measured titles, have a collision
  (§3.4).
- **Evidence** [Observed]:
  - **R2.** A record that names only `packages/elsewhere/src/polaris-copy.test.ts` still file-measures
    `apps/three-surface-poc/src/polaris-copy.test.ts:226`. The lookbehind `(?<![\w.-])` lets a basename match after
    any `/`.
  - **R4.** A record that names the same title under a different file still test-measures `production-reobserve:160`.
  - 4 test basenames are shared in the tree today: `cli`, `git-object-reader`, `package` and `pipeline`.
- **Failure scenario:** a hook or titled test in one of those four files, or in any future duplicate, is "measured"
  by a record of its namesake.
- **Proposed fix:**
  - In `file_names`/`namer`, accept a path-bearing string only when its path equals the site's path, or ends in `/`
    plus a path suffix that resolves to that one tracked file. Accept a bare basename only when no other tracked file
    has it.
  - Where a record nests tests under a file (`full-runs.json`'s `files[].file`, `.tests.json` subjects), require
    that file to be the site's.
  - Keep R2 and R4 as mutants A14 and A15, and regenerate `citation-audit.json`.

### N4 — `later-observations.json`'s extraction script is not retained

- **Severity:** note.
- **Evidence** [Observed]:
  - The record's `text` says: "Each row's figures are read from its source by a script that asserts every literal it
    copies is there".
  - The PR body says it was "copied by a script that asserts each literal is in the raw".
  - No such script is under `docs/evidence/syzygy-bpyt-4-31/tools/` (14 files). `git grep` at `e54f65c6` for the
    record's field names `otherObservationsAtMostMs` and `observationsOverThreshold` finds only the record itself.
  - I checked 13 of its literals against the raw by my own script (`later-literals.txt`), and each is present. For
    example: `"hookMs": 5107` ×2, `1 of 33 observations` ×2, `at most 1873 ms` ×2, and `12 runs (6 base, 6 head)` and
    `16 runs (8 base, 8 head)` once each.
- **Failure scenario:** a later reader cannot re-run the extraction (rule 6). The claim that a script asserted each
  literal is then unverifiable, though the figures themselves hold.
- **Proposed fix:** retain the script as `tools/later_observations.py`, and name it with its sha256 in the record.
  Or reword `text` to say that the figures were copied by hand, and are checked by the literal list.

## 5. Every changed output

- **Product outputs: none.** [Observed] No product source is in the delta (§2). Hosted `node` and `checks` pass at
  `e54f65c6`. Locally, `check_governance` reports `0 FAIL (53 checks)` and `check_quotations` reports 0 findings.
- **Test-runner budgets, against `f44cd65d`:**
  - one hook budget comes back: `dossier-cap-measure.test.ts:12`, from the 10000 ms hook default to its base 120000 ms;
  - no test's resolved timeout changes, because the 43 changed tests are the same as at `d0ccce69` (§3.3).
- **Test-runner budgets, against the base `f7477f52`:**
  - 48 sites fall back to vitest's defaults: 41 test sites, which register 43 tests, and 7 hooks;
  - the other 75 workable sites keep their base expression and value.
- **Records.** 22 files change or are added under `docs/evidence/syzygy-bpyt-4-31/`: 15 JSON records and 7 tools. Every lane tool I
  re-ran reproduces its record byte for byte, or equal except for the run commit:
  - census, `decide.py`, `check_removals.py` and the audit: byte for byte;
  - census mutants, decide mutants and removal-check mutants: equal except for the run commit;
  - host stubs: byte for byte with OUT at its own path;
  - collect-timeouts: equal except for the head commit.

## 6. Verdict on each round-1 finding's repair

| Round-1 finding | Repair | Verdict |
|---|---|---|
| **F1** `dossier-cap-measure:12` removed past the threshold | Base `}, 120_000);` restored byte for byte, with a reason. `--later` refuses the removal for the `later` reason. Dropping the row makes the head and the holding set disagree | **Repaired**, with landing condition N1 |
| **F2** `production-reobserve:160` kept on another test's record | Its reason cites two records that name this test, with 3929–8477 ms full and 979–1569 ms alone. Kept at its base value, since its worst, 8477, is over 2500. The audit now refuses a titled test with only a file match (A12 and my R3 killed). Residuals: 2, by the audit and by my second method | **Repaired** |
| N1 census M8 | Valid rename. SyntaxError counts as an error, and fails the suite (my probe: `M8 error`, exit 1) | Repaired |
| N2 census blind forms | Follow-up `syzygy-bpyt.4.41` (exists) | Deferred, as the note allowed |
| N3 `decide.py` constants | T1–T3 source mutants, all killed on separating sites | Repaired |
| N4 stem match | Stems refused (A13 and my R1 killed). A same-basename other file still matches (R2), which round 1's "basename equality" permits | Repaired as written; N3 above |
| N5 `--hookTimeout` not applied | The hook tool's header says so, and the PR body extends it to the test script | Repaired |
| N6 line numbers at `546f1ff0` | The PR body's "Line numbers" paragraph | Repaired |
| N7 near-threshold hooks | Follow-up `syzygy-bpyt.4.41`. In my full run their suites' hook time (duration less children) was 2594, 1802 and 2302 ms | Deferred, as the note allowed |
| N8 pipeline-demo labelled "file" | A hand reading of the `-t 'README command'` filter, checked against the title; now `"measured": "test"` | Repaired |
| N9 cap1-system exit 1 | Per-run causes [Unknown]. The probe shows the RPC timeout, and an exit-0 set of 5 exists | Repaired |
| N10 `cited.json` commit | `linesAt` `546f1ff0…` | Repaired |
| N11 #532 sentence | Reworded. I did not re-verify #532's 10 files this round | Repaired (text) |
| N12 host stubs | `check_host_stubs.py`, 55 of 55, and H1 and H2 killed | Repaired |

**The class ruling is none** (§2). Nothing a gate accepts or refuses changes under GP-Q0.

**Verdict: CONFIRM WITH EXCEPTIONS.** No finding meets a REVISE condition of the brief:

- the removal past the threshold is restored;
- the kept reason now cites a measurement of its own site;
- no site is below its default or resized;
- every recorded figure I re-derived reproduces;
- the full suite and hosted CI pass;
- no gate behaviour changes.

Under the owner's notes-only stopping rule, this round clears the reviewed bytes. N1 is a condition on the landing
sequence, not on these bytes.

## 7. Test quality

- **Net test delta: +0 ~0 −0** (test-rigor #10). [Observed] `collect_timeouts.py` re-run gives 5411 tests on each side,
  with 0 at one side only. The repair adds no test.
- **Determinism** (test-rigor #6, "A test that fails intermittently is worse than no test"). The repair keeps budgets
  on two sites whose measured worst exceeds half the default under load: 5107 ms for the hook and 8477 ms for the
  test. That is the conservative choice, and it is what the coordinator's rulings require.
  - The underlying slowness under load is not addressed here. That is the right scope for a timeout-reasons bead.
  - The default-timeout failures and the drain flake in the PR's follow-up list remain open items under #6.
- **Tool rigor.** The repair adds a mutant for each new predicate: M10 and C3, A12 and A13, T1–T3, and H1 and H2. Each
  is killed or held as stated. The gaps that remain are in identity and aggregation, not thresholds: N2's L4 and L5,
  N3's R2 and R4, and N4's missing extractor. Each is latent today, by the sweeps in §3.1 and §3.4.

## 8. Cleanup

Removed:

- the `base` and `merge` worktrees (`git worktree remove --force`);
- the scratch clone `rev-537b/clone/`;
- the TMPDIRs `/tmp/r537b-1`, `/tmp/r537b-2`, `/tmp/r537b-3` and `/tmp/r537b-4`. After that, `ls -d /tmp/r537b-*`
  printed `No such file or directory`.

The census-mutant probe copy, `census_mutants_r2probe.py`, was removed from the clone's tools directory before the clone
was deleted.

Deleted as over 300 KB: `runs/full/full-report.json`, 1,469,648 bytes, sha256
`d30e6a67991ff7a7023611118caa06762b7cb819d2b11b278ccf3c7d7383fdec`.

- Its rows for the 2 repaired files and the 11 removal files are kept in `runs/full/full-report-extract.json`.
- `tools/removals_in_full.py` gives the same output on the extract as on the full report.

No kept file is over 300 KB. Every kept tool and result file, with its sha256 (paths relative to `rev-537b/`):

| File | sha256 |
|---|---|
| `audit-mutants.json` | `1507e90260a346b0cda3f4d742042196717e1dbaa016076034b7df830f1b0f1d` |
| `basename-sweep.txt` | `e0a522b6a6187f53f8a4f132f510887e42a6945d763a306b57ac272659f174a8` |
| `census-compare.txt` | `1cfd59a8c39d3d446076a688bf576848873dfd55b9b0de5d3880fd4450ca12c9` |
| `check_governance.log` | `b83b7d073219514f33998333f8f8387b4a2df151077fd2c7badc28840ef619eb` |
| `check_quotations.log` | `03aeebee1c048ec13b5e76f2950d86f0f7d335950f8dd32a4caac9fd938abbc7` |
| `digest-bound-sweep.txt` | `0560fdf0427ec12f982b3abf43c95342bc04aa322a5e581efc0d944ec9bae362` |
| `f1-check.txt` | `738de55ca55d878643cd947c25635d16ab029b1d428c8130461d67025b017edb` |
| `f2-check.txt` | `832933dd27e47fa48701a8ddea1de1307e3264698e2188b5c6a8ae960dddf2c7` |
| `hosted-runs.txt` | `95afb208f7593c3a167381ce80551376c90419ac249e5790edab47de5543b6cd` |
| `later-literals.txt` | `281b38e4d454fa9649e80f31261bc26921e94ea1b5fefa384b253f27dcbf89e0` |
| `later-mutants.json` | `48185391a242585edc994d6dd9a85d30de0fbe6829207d376e052028e89ddd19` |
| `main-files.txt` | `f6d93f828a52762629cb3c650533c017e7012f3808c50e12c4c0d3a3862aac9c` |
| `main-head.txt` | `d4f757c1bd917b198a4d7e0c3c19a14c4b5fd281414ada6232c04effd5b4b442` |
| `main-import-lines.txt` | `f5cc818d7e0f86b6dbfff73bbfee00f6319aacb59b38878f1a603ef12c2432c2` |
| `match-546-e54.json` | `88c77d2b856e53b0f7fb7656e76af191aeb14d325274d11796ddd86273906dc8` |
| `match-546-merge.json` | `d63d94aa4caf9cb9952bbee790b1dda508a7f21b1c60530877a0c061259c3ace` |
| `merge-census-compare.txt` | `dc6bb51f704b756bb0c38d926a26a3897b3545fa00bf79e6f963bceb0e82f732` |
| `merge.log` | `29d0e25f9f7468931fc837d9beed49841d3b6277d01fa4a0c917be49f252cb76` |
| `my-census-546f1ff0.json` | `db123a53920718bbd7c2e2170425369f1fb3fe631d2c646a72a340eeab5e77e9` |
| `my-census-973965a8.json` | `91cf13b45bcb535fa5be3d2e23eec9e09a04f61957311a2aeee933eb4a32a4f8` |
| `my-census-e54f65c6.json` | `781b4ebec8ddb26c3daaa9397797396307a9c2e1c74088e0865ec9a2d7181d86` |
| `my-census-f44cd65d.json` | `e18f568e5b287e907fd495271172f03294df3efc9c86a2ddd154e4a2f9551660` |
| `my-census-f7477f52.json` | `b5121f18d280a38508bcf1e04b18d7f3968cb47c24f8bc1943c25979219fe936` |
| `my-census-merge.json` | `2642a38de1d1964dfed559d20ac514ea34fb6cb765496a465feaa1c43f616388` |
| `n9-check.txt` | `44cb0bc9fb82cf9d9a25cc181bbe16690319d76c80bb0d5aeddaac4c45426f0f` |
| `npm-ci-base.log` | `b6934657f652d529a477c4335a26c9fedff13dc01c427a0421a768a5b854e410` |
| `npm-ci.log` | `a9630efdb0a22e34bc56895a3954b59e740029061c0f96c8fbfe93d70f709e61` |
| `overlap.txt` | `a9ecc63a4b17835b057d754aeb7ae6a50c8f8b0d7681c8f9a5ad1ee37f484538` |
| `pr-body.txt` | `4ccadb48c9ee91207f2f40bf9c59757299fb404c32f06e7a3aaca1790081998b` |
| `pr-checks.txt` | `fe44a572b0b638e44d949045afb4f25c8ed6fb6b694c79b504d6e0cd5473dfd3` |
| `pr-files.txt` | `2595fbe5475c7371a8f5dad55958a500ff9575b8d7a3afc87b74a891b4107a25` |
| `r2-review.diff` | `f618b42b872bdf88d6dbbeced4e126c3a3ed2d07674408bfbeb6c025087c4fc5` |
| `relane/census-head.json` | `82540b606112b14cacc17d23941f781df6db5437011731472c13496b18ef98d5` |
| `relane/census-head.out` | `2bb38a56e6514a8fff9ac34faaf371c4839eb47becfdd14070d63c54fc8f20ea` |
| `relane/census-merge.json` | `8f04fc3144a155f1fc479e96329f05c2600c6037114b04b62916ca9ca1522df9` |
| `relane/census-merge.out` | `ca7617b8011cc25884e54e6cd405ddb0bf4074a8cdcc9631b9d49cf5e98adad0` |
| `relane/census-mutants-oldM8.json` | `47d0fb0e5259541169a4b89e811bae8040df2d1324e03a15073c132ec938b6a4` |
| `relane/census-mutants-oldM8.out` | `136d5f3aea029f5d3ddb64fda35a97f7671a98e494e1d7995a7e295f780d1986` |
| `relane/census-mutants.json` | `2011d24a04885bad585d92e034239ab843ef992afb5d46301f6d929e0446258e` |
| `relane/census-mutants.out` | `9d26ae21938ea7ec79208c2f0fc2f087fc5ffb5d156431bbd16e1d62ba7de166` |
| `relane/citation-audit.json` | `a7609e9b34dc6fe989a86c964f7c1dd5f66221c71456abfed54f53aa1d2ea149` |
| `relane/collect-timeouts.json` | `734c475d762c73ff8c19db8943c0ef90456acaa02860cce4566ee99c67391238` |
| `relane/collect.load` | `10a034be5adb2e4ec912f76c8924fc460bb016497da37bc8b6d804352888be2d` |
| `relane/collect.out` | `3b8a559ddb60771d09506c9b5d1b1af9ce4326ef24975ec7df577185ed22c64a` |
| `relane/decide-mutants.json` | `3682a8659bfd07fc6d01418b03e9cca12bb5a16c14fad7b292e8133ed46200c5` |
| `relane/decide-mutants.out` | `7bd49407deeb44dbfbbf4177b44484cb71f076ea318ba90e26ef01537ae71ac5` |
| `relane/decide.out` | `64c8d770415b070e45bf9c14b1cfe4c6229628ee8d740904ec08a8df8df50cf7` |
| `relane/decisions.json` | `03f0da52c62ee79a1844b3d8a9273641dc01fd9f8912ea6426f5a973b1f6a92d` |
| `relane/host-stubs-inplace.json` | `e401cd64797dc18f17fac80bacf88d22f528452086f170caa5e8ca9966de584b` |
| `relane/host-stubs.json` | `39e7c9d8c6d1cbdc7fac0ada7bedb292c9aedae6f3fc7cfc4bc332289df1bc7d` |
| `relane/host-stubs.out` | `c4f8e893ae83c1abe7f143baa334336a511a9d3abeef0f5820082a3385d3432d` |
| `relane/merge-citation-audit.json` | `e5e821715c99139c975ac777588e8c26a662e4ec9f98ea785d20abd3c019e631` |
| `relane/merge-citation-audit.out` | `6e0629ccce7e1a6cbc5490a1231ebccecc9bb1f96f89c3d9955ea636bef12d7c` |
| `relane/merge-removal-check-later.json` | `67de32af1a939a017558d204747a972d6d8b9320ba9b0c6585d6dfabf940a2ac` |
| `relane/merge-removal-check-nolater.json` | `414179135c77d344bbf16d5453789d5efe1b998fadee612b517ee59775ed3f5f` |
| `relane/removal-check-later.json` | `67de32af1a939a017558d204747a972d6d8b9320ba9b0c6585d6dfabf940a2ac` |
| `relane/removal-check-mutants.json` | `5f65fbca6db0b95875f8db8c0474d679cf9f9ec1865894f838c9024834b703eb` |
| `relane/removal-check-mutants.out` | `66c42d63f641f84c32325631ef4bb3482210793289343a35efc0f8f8d1aff775` |
| `relane/removal-check-nolater.json` | `414179135c77d344bbf16d5453789d5efe1b998fadee612b517ee59775ed3f5f` |
| `rule11-digests.txt` | `91deccdde5e07eaa9c4de11e3b2119c4f51081a8ceb5ebf2d24953dddc3b274a` |
| `runs/files-head-summary.txt` | `6c7bd1c8700d2fda8e3aa9b5436492a6012e075edd9aa59d09accf9d68910f53` |
| `runs/files/head-r1-dossier-cap-measure.test.json` | `821c55d7129609989a0fa45271907d3188261629df6c1556646adcf4b6cb11e4` |
| `runs/files/head-r1-production-reobserve.test.json` | `79a6a24ad7c2b623bacae3ab590f28c46edb13e60e0b32addd13d4642cf27fe4` |
| `runs/files/head-r2-dossier-cap-measure.test.json` | `7f016bac077431a6174ad20b55f8c01ce1a521d0ba9036c1fe95aa12eba9f211` |
| `runs/files/head-r2-production-reobserve.test.json` | `2cd10f90d07280aa50c038450c043e1b0b49042340101f62b2ec5f6b92f667a5` |
| `runs/files/head-r3-dossier-cap-measure.test.json` | `8a9e86c06457c66745e4ad2c980f20c9e81e8406efd31db01821b05608071315` |
| `runs/files/head-r3-production-reobserve.test.json` | `f2919e838d80c50615776ceaa5b20e52af6adbc30a343e6f1405837ef150c76d` |
| `runs/files/head-r4-dossier-cap-measure.test.json` | `c1c900d49bb95c63ea14567ffbaf206900b572311d324cfe35edb736368a87ad` |
| `runs/files/head-r4-production-reobserve.test.json` | `c1945ed7de52bc86388dff2790f3bb316baeebf5a7aee4287f77e64359fd5f23` |
| `runs/files/head-r5-dossier-cap-measure.test.json` | `ec0a1e9f570ab3180ce9c1588b2ea400ac9a51e10174f02da93bdbcd72e38f58` |
| `runs/files/head-r5-production-reobserve.test.json` | `b30d53ffb10eac1fa7053d0103733e9d460ebd6f20d7bf42bb848dc8afd0d068` |
| `runs/files/head.jsonl` | `a533a39b2ab8ef740a15df4d1ef8c547592ccdeefd6b97c6b03bfafade658c81` |
| `runs/full/exit.txt` | `4c90c4a06c920614b9015de53c114cce9815739a2b560b1c41d540a54855bcb7` |
| `runs/full/full-report-extract.json` | `28849afcf9106176f7aab28160ae5f931ad31c5ef41d264a3734af16da76278d` |
| `runs/full/full-summary.txt` | `274d3eae709c3199963d43c8de20cab5b0e686e0ece22ac1a736dd4b19d4fcee` |
| `runs/full/full.log` | `7a4b9d4759afc19abda2966e83b7d052f20f4839b5729604e869d48ef2f5d0ee` |
| `runs/full/load-start.txt` | `8dcb087e4bc7a467142094c2eaeb3828bbc9e122db8d985bb56cce518005ec1f` |
| `runs/full/removals-in-full.txt` | `aa88b2644c783905ce0eeb9aed6cee8a80c3c15ff93ffb9f6de83000715a7d4c` |
| `title-collision-sweep.txt` | `0ca1feb3a8ae7363efe009e262cec323a896f9a65645ac8115a260a3ce0d8aa9` |
| `title-presence.txt` | `1834ed13dbbd0b6895ae51889d960b10ebf0a9a60ce0bd4101f10b1f577f5fad` |
| `token-check.txt` | `eb2e09f63d29cfbe2d79b497cd00b31729eb05abdc5f3721c01aad5fd4e4099f` |
| `tools/audit_mutants.py` | `174f5171ebd85df1f275116f3f916f8d39b932aeaeba910f661a19c48a62da8b` |
| `tools/later_mutants.py` | `07f60c76600d7b1c0eb85096d6a985145daac5e1886909859055cd6cb018fbf6` |
| `tools/match_sites.py` | `da94af4bc512f1e532679fbc5229203f41cc3581b41e2b7f055b9b683853f778` |
| `tools/my_census.mjs` | `55cbf0a64639537013fb48383aecec3a4324a557ac6cab95fd7df66ed5dec7f5` |
| `tools/r2_reporter.mjs` | `12c99ed10bdc8f3d4d91ad3070c72416a88b268c78e9208d998e40398037eaf4` |
| `tools/removals_in_full.py` | `b44eb727b59ec83e82c804ff1affd4a58a8b2c87758c042d9b899d13efa20ede` |
| `tools/run_files.py` | `b4f72c554ceacc8c85c23a5169d5074c4a7f45a8d30f45ce91ec1bd7ad9bc528` |
| `tools/summarize_runs.py` | `b88cca31077414283fd56c29009261128292547e6ca052ec78a9b3cf9eb77a91` |
| `tools/title_presence.py` | `982ebf176a8088c7722a06d22189d837bad0fdd40ac13385a372eb430528fa98` |
| `tools/token_equal.mjs` | `304743771f6d3725e6a1ff8df65157e37c63439fe85450222b41ed62b7bdd2b6` |
| `typecheck.log` | `c9f94dbf1ac9cba0ff41baa238ccd00616732ad0319c3cb0b99f1af2aa25cbe2` |
| `unevaluated-consts.txt` | `eb6aa3c11ee79448470c433ba929b81534271d3d1a8ca461e471aad457164bb6` |

93 files kept. The raw review itself is not listed; its sha256 is given in the reply.
