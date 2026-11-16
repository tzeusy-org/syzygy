# R-GP-IMPL-TEST-TIMEOUTS-1 — CC-REV-1 implementation review of syzygy-bpyt.4.31, round 1
Verdict: REVISE
Reviewed commit: f44cd65d
Subject: r1-review.diff sha256 09f3105478c5988d45f03f7b6c593677550241a5ad9c763d2f543d5cd7d83b0f

Reviewer: an independent fresh-context agent. I did not write this change and did not edit it. Brief:
`scratchpad/lead/b431/brief-r1.md`. Reviewed 2026-10-27. Paths below that are not repository paths are relative to
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-537/` ("rev-537/").

Two blocking findings, twelve notes:

- **F1** — the removal at `dossier-cap-measure.test.ts:12` (a `beforeAll`) ran past ruling 1's 5000 ms hook threshold
  in 1 of my 5 threshold runs: `Error: Hook timed out in 5000ms.`, at load1 46.40 → 54.89.
- **F2** — the test at `production-reobserve.test.ts:160` keeps 60 s on a record that measures other tests of its file,
  not this one. Ruling 6 makes that a counted residual, and the PR does not count it. `citation_audit.py` accepts the
  case, and my mutant T4 shows the audit cannot tell the difference.

## 1. Subject identity checks

All [Observed]. I ran these by script, not by reading the files.

- Subject file: `sha256sum r1-review.diff` printed
  `09f3105478c5988d45f03f7b6c593677550241a5ad9c763d2f543d5cd7d83b0f`. `git diff f7477f52 f44cd65d | sha256sum` printed
  the same value, and `cmp` with the subject file printed `identical`. **Matches.**
- `git diff f7477f52 f44cd65d -- apps packages | sha256sum` printed
  `17b2c14dc3407f4274e2a9647c0d9080666bcfadefbccf31717bdf51875ddc2d`. **Matches.**
- `git diff --shortstat`: `115 files changed, 76922 insertions(+), 110 deletions(-)`. Under `apps packages` it printed
  `31 files changed, 107 insertions(+), 110 deletions(-)`.
- How the 115 split: 23 files under `apps/` and 8 under `packages/`. Of those 31, 30 are `*.test.ts` and one is
  `packages/cap1-system/vitest.config.ts`. The other 84 are all additions under `docs/evidence/syzygy-bpyt-4-31/`.
- `git merge-base f7477f52 f44cd65d` printed `f7477f52c49ee347f96b92703887c31f6be49e07`, which is the brief's base.
- `git diff --quiet d0ccce69 f44cd65d -- apps packages` succeeded, so the head's code equals `d0ccce69`'s.
  `d0ccce69` is the commit the lane's head census reads.
- **Main.** I fetched `main` from GitHub at the end of the review. It is `d38d7a3ce632a34c2a41bdb77ad323ba0b05b777`,
  68 commits after the base, and `git diff --name-only f7477f52 d38d7a3c` lists 238 files.
  - `comm -12` of that list and the PR's 115 gives **0** files. The lane's claim that main touches none of the 115
    holds.
  - My census at `d38d7a3c` gives 140 sites. Their (path, line, kind, expression) tuples are the same as at
    `f7477f52`. The lane's claim that main still holds the base's 140 holds.
- **PR #532** (head `9e00252a`) and `apps/three-surface-poc/src/polaris-generation/self-corpus.test.ts`:
  - #532's only hunk is `@@ -10,0 +11,3 @@`, against its merge base `8ff50172`. #537's only hunk is
    `@@ -46 +46 @@`. **They do not overlap.**
  - A trial merge of `d38d7a3c` + `f44cd65d` + `9e00252a` made `df3f5f1e` with no conflict, and `git status --porcelain`
    printed 0 lines (`trial-merge.txt`).
- **Hosted CI.** `gh pr checks 537 -R Tzeusy/syzygy`, run at the end of the review, printed:
  ```
  checks	pass	24m24s	https://github.com/Tzeusy/syzygy/actions/runs/40465393981/job/122059429358
  node	pass	4m33s	https://github.com/Tzeusy/syzygy/actions/runs/40465393936/job/122059429329
  ```
  `gh pr view` printed `f44cd65dfacd12c58776cca65cc40766fdfca6b1 OPEN MERGEABLE`. Both checks pass at the reviewed
  commit. The canonical battery does not run `npm test`. The hosted `node` job is the only full vitest run at this
  head that I know of, and I did not run the full suite myself (§3.15).

## 2. Clauses relied on, and the class ruling

**CC-REV-1**, in `.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at `f44cd65d`:

- Lines 18–20: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the
  agent performing the change never finally decides which classes it touches."
- Lines 31–43 give the classes:
  1. "**authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6)";
  2. "**graph identity** — entity identity minting, continuity, split/merge (SDR-2, SDR-22 identity-based counting)";
  3. "**deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7)";
  4. "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths";
  5. "**data migration** — `.syzygy/**` schema migrations, any identity-affecting store change";
  6. "**public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on";
  7. "**certificate logic** — when certificates exist (post-V1, future-tagged), any code that grants, invalidates, or
     renders them."
- Lines 45–47: "**Class membership is contested by default and is never finally determined by the agent performing the
  change**".
- Lines 49–50: "**The change record states** which classes the change touches, or "none," so a misclassification is a
  findable violation after the fact."

**GP-Q0**, in `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md` at `f44cd65d`:

- Line 51: "Behavior-preserving refactors may proceed under the acts already in force. They may touch `apps/**`,
  `packages/**`, `scripts/**`, tests, CI and root manifests."
- Lines 52–55: ""Behavior-preserving" means none of the following changes: a rendered byte, a wire format, a refusal
  string or an exit code; a signed or digest-bound artifact; a consent, security or retention decision."

**Test-rigor bar**, in `git show f44cd65d:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`:

- Lines 78–81: "6. **Deterministic or quarantined** — A test that fails intermittently is worse than no test: it trains
  people to ignore red. Fix the nondeterminism (time, ordering, shared state) or delete the test; never
  retry-until-green."
- Lines 93–96: "10. **Growth is governed** — … Reviews state the net test delta; adds-only growth in a mature area is a
  finding".

**AGENTS.md verification rules** I applied:

- 2 and 9: every count below gives its denominator.
- 4: I read the output of each check, not just its exit code.
- 6: I mutated the inputs and tools to confirm that the checks fail.
- 10: every figure here is bound to the stated commit.
- 11: §4 N10.

**Class ruling: none.** [Observed] for the facts, [Inferred] for the ruling. Class by class:

- **No product source changed.** 0 of the 115 files is product source. The 31 code files are 30 test files and one
  test-runner config.
- **Tokens.** In 19 of the 31 files, the comment-free token stream (kind and text) is identical at base and head. In
  the other 12, the only token changes are deleted timeout arguments, plus one deleted constant (`token-diff.txt`).
  The 12 are exactly the files that hold a removal.
- **Classes 1, 2, 3, 5, 6 and 7.** No write-universe, identity, snapshot, evaluation, schema or store code changed, and
  no endpoint, adapter contract or certificate code. The tests that assert those behaviours keep identical assertion
  and title tokens.
- **Class 4, contested place 1: `no-egress.test.ts:47`.** That is the lane's line number at `546f1ff0`; the line is
  `:48` at the base `f7477f52`. The change deletes `, 120_000` from the `beforeAll` that builds the esbuild bundle the
  S10 proof runs. The hook now inherits the 10000 ms hook default.
  - A hook timeout can only fail the file red. It cannot make the proof's assertions pass, and they are
    token-identical: `expect(run.calls.filter((line) => INTERNET_FAMILY.test(line))).toEqual([])` and the canary's two
    `toBe(true)`.
  - The egress path itself is product code, and it is untouched. So no egress path changes.
  - On this host `strace` is present (`/usr/bin/strace`). Both S10 tests ran and passed in all 5 of my threshold runs,
    and the hook's worst time was 855 ms.
- **Class 4, contested place 2: the consent-gate tests.** In `package-reader.test.ts`, `real-tree.test.ts`,
  `gate-acts.test.ts` and `start-gates.test.ts`, the base and head token streams are identical, so the edits are
  comments only. No consent decision changes.
- **GP-Q0.**
  - No rendered byte, wire format, refusal string or product exit code changes, because no product code changes.
  - No digest-bound artifact changes. The 62 digests of the 31 base files (31 sha256 and 31 blob ids) are cited by 40
    files, all under `docs/evidence/`. 0 act-manifest rows carry them.
  - No consent, security or retention decision changes.
  - No gate code changes, so nothing a gate accepts or refuses changes.
  - Test timeouts are a test runner's budget, not product behaviour. Under GP-Q0 this change is behaviour-preserving.

  What a timeout can change is a test outcome under load, and F1 is an instance of that. That is test-suite
  reliability, not a GP-Q0 behaviour.

## 3. What I ran, and the results

Host: 12 logical CPUs. Every timed run recorded `/proc/loadavg`, and load1 ranged 22.12–63.24 across my runs. Other
reviewers and lanes were running beside me, so every timing below is bound to the load printed next to it.

### 3.1 Workspace

- `git clone /home/tze/GitHub/syzygy`, then I added GitHub as a remote and fetched `main` and the branch.
  `npm ci` exited 0 for the head clone and for the base worktree (`npm-ci-head.log`, `npm-ci-base.log`).
- Worktrees:
  - `base` at `f7477f52`;
  - `lt` at `f44cd65d`, for the lane's tools and my mutants;
  - `trial` for the merge above.
- Every vitest run used a private TMPDIR, `/tmp/r537-<n>`. All of them are deleted (§8).

### 3.2 My census of explicit timeouts (my own method, not the lane's tool)

Tool: `tools/rev_census.mjs`. It parses git blobs at a commit with the repository's TypeScript compiler API, and its
header publishes the predicate in full. In short:

- **Population.** Every tracked `.ts .mts .cts .tsx .js .mjs .cjs` under `apps/` or `packages/`, excluding `.d.ts`,
  `dist/` and `node_modules/`, plus root `vitest.*`. All `package.json` files are swept separately for
  `--testTimeout`, `--hookTimeout` and `--teardownTimeout`.
- **A candidate** is a call `C(a0..an)` that meets one of three predicates:
  - **S1:** a function-literal argument followed by any later argument;
  - **S2:** a test-API callee with ≥3 arguments, or a hook with ≥2;
  - **S3:** a test-API callee with an object-literal argument that has a `timeout` property.
- **Callee resolution.** The callee is reduced to its root identifier through property accesses and curried calls
  (`it.skipIf(x).each(t)` → `it`). A local const whose initializer reaches a test API through `?:`, `||`, `??`,
  parentheses, property access or calls counts as an alias of that API.
- **Test-API roots.** `it test describe suite bench` count as test or suite; `beforeAll afterAll beforeEach afterEach`
  count as hooks.
- **Sites.**
  - A candidate whose root is a test API, by name or by alias. Its timeout expression is the argument after the last
    function literal, or the `timeout` property.
  - Every `vi.setConfig(...)` call.
  - Every property assignment named `testTimeout`, `hookTimeout` or `teardownTimeout`.

  Every other candidate is listed as excluded, with its callee chain. A site's line is the line of its timeout
  expression.

Results [Observed]:

| Commit | Population | Sites | test / hook / suite / config | Files | CLI flags | Excluded candidates |
|---|---|---|---|---|---|---|
| `f7477f52` (base) | 514 | **140** | 118 / 19 / 1 / 2 | 41 | 0 | 134 |
| `546f1ff0` (lane's base) | 508 | 140 | 118 / 19 / 1 / 2 | 41 | 0 | 134 |
| `d38d7a3c` (main now) | 515 | 140 | 118 / 19 / 1 / 2 | 41 | 0 | 134 |
| `f44cd65d` (head) | 514 | **91** | 77 / 11 / 1 / 2 | 33 | 0 | 134 |
| `a088f1ca` | 499 | 124 | 102 / 19 / 1 / 2 | 41 | 0 | 133 |

- **The excluded 134 at the base** are all non-test callees. For example: `setTimeout` 10, `pocRoutes` 7,
  `reports.reduce` 7, `vi.waitFor` 1, and `expect(fn, msg)` (`excl.txt`). None is a Vitest API.
- **Against the lane's census, by (path, line, kind)** (`census-compare.txt`):
  - `mine 140 lane 140 both 140` at `546f1ff0`;
  - `mine 91 lane 91 both 91` at the head (lane `census-head.json`, `d0ccce69`);
  - `mine 124 lane 124 both 124` at `a088f1ca`.

  Each comparison prints the same single expression-text difference,
  `(('apps/three-surface-poc/src/restart.test.ts', 331, 'suite'), 'timeout: TEST_MS', 'TEST_MS')`. That is
  representation only: I print the property, the lane prints its value.
- **From `546f1ff0` to `f7477f52`,** the only change is that the three `no-egress.test.ts` sites move down one line
  (47→48, 84→85, 92→93). Main added the `'@syzygy/support'` alias line to that file's esbuild options.
- **The lane's 123** are the 140 less the 17 deferred sites. My census counts the deferred files' sites at the base as
  `main.test.ts` 11, `redis-shaped-discovery.test.ts` 2 and `git-object-reader.test.ts` 4, which is 17. So 123
  matches.
- **The 49 removals.** The head has 91 sites: 74 kept and 17 deferred. 140 − 91 = 49 removals, which equals the 49
  holding rows of `removal-check.json`.
- **Census differential on a fixture.** I built a fixture of 30 forms (`tools/fixture/forms.test.ts.txt`) and ran
  both censuses on it (`fx-*-census.json`): `mine 26 lane 17 both 17`.
  - The lane misses 5 forms:
    - the shorthand `{ timeout }` (`:15`);
    - a conditional suite alias, `c ? describe : describe.skip` (`:22`);
    - a conditional test alias (`:23`);
    - a `let` alias (`:24`);
    - element access, `it['skip']` (`:26`).
  - Mine has 4 false positives:
    - `bench(..., { time: 1 })` (`:27`);
    - a double count of `vi.setConfig({ testTimeout })` (`:28`);
    - a function as the third argument (`:30`);
    - a `testTimeout` property in a non-config helper (`helper.ts:2`).
  - **Neither set is live.** The real populations agree exactly at three commits, so no instance of any of the 9
    forms exists in the repository: the 5 the lane misses would show as sites only mine finds, and the 4 false
    positives would show as extras in mine. [Inferred from Observed]

### 3.3 Behaviour preservation, over the 31 files

Tools: `tools/tokens.mjs` writes the comment-free AST leaves of each file, skipping JSDoc. `tools/token_diff.py` allows
exactly two differences:

- a deleted `, <timeout>` just before `)`, where `<timeout>` is a census site removed between base and head;
- a deleted `const <Name> = <number> ;` where `<Name>` was such a site's expression.

Output (`token-diff.txt`):

```
files 31 violations 0
removed sites seen by token diff 49 expected by census difference 49
seen != expected: []
deleted constants {('apps/three-surface-poc/src/polaris-generation/durable-lifecycle-generate.test.ts', 'T'): '30_000'}
exit 0
```

`tools/token_diff_mutants.py` (`token-diff-mutants.txt`) ran six mutants, and all six were KILLED:

- **title:** `'removes the Chromium form…'` → `Chromiun`;
- **assertion:** `toEqual` → `toStrictEqual`;
- **extra-removal:** `seen != expected: [(('apps/three-surface-poc/src/tuple-encoding.test.ts', '60_000'), 1)]`;
- **resize:** `['45_000'] → ['40_000']`;
- **const-still-used**;
- **added-timeout.**

**The config file** (`config-strip.txt`):

- The raw sha256 differs: base `6e7702d9…`, head `a31da5a5…`.
- With `//` comments stripped, both hash to `151d2c8fdc96620afbe424236cb5859ffef27aa82f354368dfed577cae60bd73`. The
  script printed `stripped identical: True | base has // comments: 9 | head: 11`.

So the file is byte-identical without comments. The diff adds a trailing comment on `testTimeout: 60_000` and on
`hookTimeout: 60_000`.

### 3.4 The removal sample: all 49 removals, including all 8 hooks

I did not sample: I ran every removal. That covers the 12 files that hold a removal, 5 rounds each, at the head:

- 60 runs in all, with load1 27.17–54.89;
- rounds are the outer loop, so each file's runs are spread across the session (`tools/run_sample.py`);
- the task tree came from my reporter (`tools/tree_reporter.mjs`), which records each test's duration and each suite's
  `hookMs`, its duration less its children's.

**The config.** Vitest 3.2.7 does not pass CLI `--hookTimeout` to projects, so the hook budget had to come through a
config file, `tools/threshold.vitest.config.mjs`. It is the root config with `test.hookTimeout` set to 5000, ruling 1's
hook threshold, and `test.testTimeout` set by `REV537_TEST_MS`.

- **The hook budget is certain.** The hook error text quoted below states 5000.
- **The test budget is not recorded.** I set `REV537_TEST_MS` to 2500, but the run records do not carry the
  environment. I therefore rely on the measured durations only.
- **Positive control.** At `REV537_HOOK_MS=1`, two files failed with `Error: Hook timed out in 1ms.`
  (`runs/sanity/`).
- **Negative control** (`cli-hooktimeout-control.txt`). `npx vitest run …/governing-intent-sweep.test.ts
  --hookTimeout=1` printed `Tests  28 passed (28)` and exited 0 at load1 42.74. Its hook at `:168` no longer has an
  explicit timeout, so the CLI flag never reached the project.

Results (`removal-analysis-head-thr.json`, `runs/removal/`, `runs/removal-progress.log`):

- 59 of 60 runs exited 0.
- **Tests.** The 41 removed test sites (43 tests, since two are `it.each` with two rows) had 215 observations, all
  passing. The worst observation per file:

  | File | Sites | Worst (ms) |
  |---|---|---|
  | `cdp-browser.test.ts` | 16 | 36 |
  | `fixture-directories.test.ts` | 14 | 481 |
  | `durable-lifecycle-generate.test.ts` | 6 | 35 |
  | `polaris-opening-index.browser.test.ts` | 5 | 787 |

  The overall worst is 787 ms, at `opening-index:408`. All 41 test sites are under the 2500 ms threshold.
- **Hooks**, with 5 observations each. Threshold 5000 ms. Lane figures are from its records.

| Site (line at `546f1ff0`) | My worst `hookMs` | Over threshold | load1 range | Lane alone / full worst |
|---|---|---|---|---|
| `governing-intent-sweep:168` | 253 | 0 | 29.62–44.01 | 230 / 2018 |
| `orrery.browser:24` | 2848 | 0 | 29.49–42.41 | 447 / 3391 |
| `polaris-accessible-names.browser:187` | 3722 | 0 | 29.49–46.40 | 766 / 4750 |
| `dossier-cap-measure:12` | **5107** | **1** | 34.14–54.89 | 933 / 3313 |
| `polaris-reconciliation:81` | 884 | 0 | 33.97–54.89 | 793 / 2630 |
| `trajectory-narrowing.browser:32` | 1724 | 0 | 33.52–52.37 | 572 / 4180 |
| `unknown-route-sweep:173` | 622 | 0 | 33.52–49.93 | 533 / 2516 |
| `no-egress:47` | 855 | 0 | 32.15–46.10 | 736 / 2761 |

**The one failure.** It is round 3 of `dossier-cap-measure.test.ts`, with `exit 1 wall 26.9 load1 46.40 54.89`. Its
output tail:

```
 FAIL  |@syzygy/three-surface-poc-app| apps/three-surface-poc/src/polaris-generation/dossier-cap-measure.test.ts [ apps/three-surface-poc/src/polaris-generation/dossier-cap-measure.test.ts ]
Error: Hook timed out in 5000ms.
 ❯ apps/three-surface-poc/src/polaris-generation/dossier-cap-measure.test.ts:9:1
      9| beforeAll(async () => {
   Duration  13.87s (transform 4.25s, setup 46ms, collect 6.33s, tests 5.11s, environment 0ms, prepare 245ms)
```

The tree record gives `"durationMs": 5106.681987`, `"errors": ["Hook timed out in 5000ms."]` and `"hookMs": 5107`. The
file's one test was skipped.

**Further runs of that file,** at each checkout's own config, where the hook budget is the 10000 ms default
(`dcm-summary.txt`, `runs/dcm/`, `runs/dcm2/`, `tools/run_ab.py`):

- 12 runs (6 base, 6 head) at load1 22.53–23.65: `hookMs` 585–929, all passing;
- 16 runs (8 base, 8 head) at load1 52.65–63.24: `hookMs` 806–1873, all passing.

So the hook exceeded 5000 ms in 1 of 33 observations. The other 32 were at most 1873 ms. The exceeding run's
`collect 6.33s` and `wall 26.9` s are well above the 3.9–5.0 s wall times of the other four threshold rounds, which
points to a host stall at that moment. [Inferred] It is still a run of the site's own hook past ruling 1's threshold.
[Observed] See F1.

**Removals and tests that time out at the default.** No test in the 12 removal files timed out in my 60 runs; the one
failure is the hook above. None of the 4 files that hold the lane's six local failures holds a removal: the 12 removal
files and those 4 have no name in common. [Observed]

### 3.5 The six local failures, at base and at head

**Explicit timeouts** (`six-blame.txt`, `tools/find_test.mjs`). The registration call of each of the six has 2
arguments at both `f7477f52` and `f44cd65d`, so none has an explicit timeout. My census lists none of them at either
commit. `git blame` of each call's closing line at the base names a commit reachable from the base:

| Test | Closing line | Blame |
|---|---|---|
| `gate-acts` "render the sign-off record byte for byte" | 620 | `51a6ecc4` |
| `start-gates` "pins the consented HEAD…" | 204 | `db510842` |
| `start-gates` "refuses config naming a remote, a promisor…" | 512 | `44195483` |
| `start-gates` "reports D9 and the RFC7-20 reading…" | 1033 | `db510842` |
| `polaris-accessibility.browser` "keeps diagram labels legible…" | 172 | `6fa339b6` |
| `polaris-authority-sweep` "no source/authority/provenance field…" | 203 | `10ce1368` |

The lane's statement that none of the six carries an explicit timeout at base or head holds. [Observed]

**A/B runs.** I ran the 4 files together, alternating base and head, for 3 rounds each at each checkout's own config
(`tools/run_ab.py`, `runs/six/`, `six-report.txt`, `runs/six-progress.log`):

```
six base 1 exit 0 wall 101.9 load1 22.12 26.52
six head 1 exit 0 wall 100.6 load1 26.52 27.73
six head 2 exit 0 wall 105.4 load1 27.73 25.99
six base 2 exit 0 wall 181.4 load1 25.99 51.52
six base 3 exit 1 wall 180.1 load1 51.52 53.33
six head 3 exit 0 wall 161.2 load1 53.33 52.00
```

The base round-3 failure was `FAILED start-gates.test.ts | refuses config naming a remote, a promisor, an include or a
command the agent's git would  5096 ['Test timed out in 5000ms.']`. In head round 3, at the same load, the same test
passed at 4792 ms.

So one of the six reproduced as a default-timeout failure **at the base**, and I saw none at the head. These are
pre-existing load failures that this PR does not cause. [Inferred from Observed]

The limit: I did not reach the lane's load1 of 67–72, so I reproduced only one of the six.

### 3.6 Kept reasons, by ruling 6

**My lookup.** `tools/cite_lookup.py` is independent of the lane's audit. For each kept site it reads every cited
record at the census commit, lists each string carrying the site's title with its numeric siblings, and prints each
cited commit's lines that carry a duration.

I ran it over **all 74 kept sites** (`cite-lookup-all.txt`) and over a 20-site sample read by hand
(`cite-lookup-sample.txt`). The sample includes both residuals and both file-only tests. `tools/cite_summary.py`
tabulates the 74 against the audit (`cite-summary.txt`):

```
sites 74
2 ('config', 'no-title-site', 'file')
1 ('hook', 'commit-only', 'file')
1 ('hook', 'commit-only', 'test')
8 ('hook', 'no-title-site', 'file')
1 ('suite', 'commit-only', 'file')
2 ('test', 'commit-only', 'None')
4 ('test', 'commit-only', 'test')
2 ('test', 'test-without-title-hit', 'file')
2 ('test', 'test-without-title-hit', 'test')
51 ('test', 'title-in-record', 'test')
```

That agrees with the lane's 58 / 14 / 2:

- **58 by test name:** 51 + 4 + 2 + 1;
- **14 by file:** 2 + 1 + 8 + 1 + 2;
- **2 residuals:** `None`.

My reading of the sample, where ✓ means the measurement satisfies ruling 6:

| Site | Cited | What it holds | Ruling 6 |
|---|---|---|---|
| `polaris-opening-index.browser:424` | `da936967` | it runs only on an operator capture; no measurement; the reason says "an unmeasured residual of syzygy-bpyt.4.31" | counted residual ✓ |
| `test-artifact-verification.live:139` | `2c1f8d5a` | likewise | counted residual ✓ |
| `pipeline-demo:73` | `pipeline-demo-onramp-budget-2026-10-15.json` | `postChangeVerification.command` is `npx vitest run …pipeline-demo.test.ts -t 'README command'`, which selects this test; `wallSeconds` 183, 195 and 211 | same site, by a name filter ✓ (N8) |
| **`production-reobserve:160`** | `poc-test-timeouts-2026-10-03.json` | **0** strings carry the title. The audit's match is another test of the file: `"name": "production-reobserve.test.ts > keeps the production probe identity bound to the captured observation instant", "duration": 6` | **✗ F2** |
| `production-reobserve:99` | same record | title in 27 strings; full-run worst 17058 | ✓ |
| `package-reader:111` | `syzygy-bpyt-4-13/timeout-sizing.json` | `"worstMs": 14149, "timeoutMs": 45000` | ✓ |
| `package-reader:1061` | same | `"worstMs": 16465` | ✓ |
| `surface-routes:420` | `syzygy-bul-browser-ci-correction-2026-09-23.json` | the record's direct and tailnet cases (1562 ms), with `caseLocalBudgets` 15000 | ✓ [Inferred: case identity is a reading] |
| `surface-routes:453` | same | the missing-capability case, 1832 ms, budget 10000 | ✓ [Inferred] |
| `polaris-copy:226` (hook) | `poc-test-timeouts-2026-10-03.json` | the file's tests, with durations; the hook has no test name | file plus duration ✓ |
| `restart:321` (hook), `restart:331` (suite) | `b48d86fa` | "failed: two hit vitest's 5 s default", "180 s." | file plus duration ✓ |
| `gate-acts:98` | `0a08add9` | "about 2-5 s unloaded", added to exactly the two tests that use `TREE_TIMEOUT` | ✓ |
| `keyboard-sweep-record:59` | lane durations record | title present, `durationMs` 4907 | ✓ |
| `fresh-clone.system:117` | lane hooks record and `ci-durations.json` | title present, 77485 local and 18861 hosted | ✓ |
| `draft-preview.browser:47` | `full-runs.json` | title present, 3280 and 4070, plus one timeout | ✓ |
| `build-output:62` | `load-timeouts-gb4l-2026-10-03.json` | `"worstMs": 69926` | ✓ |
| `governance-inputs:504` | `governance-inputs-timeout-2026-10-03.json` | the subject names the test | ✓ |
| `cdp-browser.browser:82`, `:112` | lane durations record | title present in all 5 runs; worst 15.8 s and 12.6 s, as their reasons state | ✓ |
| `tuple-encoding:94` (hook) | `shared-fixture-models-k66p-2026-10-03.json` | `targetFiles.tuple-encoding`, `fileMs` 14058 | file plus duration ✓ |

**The production-reobserve record predates the test.** `poc-test-timeouts-2026-10-03.json` was last written at
`f5e31660` (2026-10-03 04:54 +0800). The test at `:160` was added by `c069f5f5` (2026-10-03 23:46 +0800). `git
merge-base --is-ancestor` confirms `f5e31660` is an ancestor of `c069f5f5`. `grep -c 're-evaluates an unchanged'` on the
record prints `0`. [Observed]

**Re-running the lane's `citation_audit.py`** reproduced the retained `citation-audit.json` exactly
(`citation-audit-rerun.json`):

`{"sites": 74, "citations": 76, "measuredByTest": 58, "measuredByFileOnly": 14, "residuals":
["apps/three-surface-poc/src/polaris-opening-index.browser.test.ts:424",
"packages/three-surface-poc-core/src/test-artifact-verification.live.test.ts:139"]}`

Its own input mutants, A1–A11, are all killed. **My input mutant of one citation, T4 (§3.9), was not caught**, so a
citation that measures a different test of the same file passes the audit.

**`tools/reason_check.py`** is my independent check that each kept site has a reason with a citation
(`reason-check.txt`):

- head, 3 deferred files excluded: `kept sites checked 74 without a reason 0 without a citation 0`;
- base, the positive control: `kept sites checked 123 without a reason 88 without a citation 20`.

### 3.7 Below the default (ruling 3)

`tools/below_default.py`, over the 123 in-scope base sites (`below-default.txt`):

```
in-scope sites 123 evaluated 119 below default 0 not evaluated 4
```

I read the 4 not evaluated by hand:

- the three `SHARED_FIXTURE_TIMEOUT_MS` hooks are `60_000` (`test-model-fixture.ts:248`);
- `ONRAMP_TEST_BUDGET_MS` is a step sum of `450000`.

So **0 of 123** sites are below their default. The positive control, with no file deferred, printed `BELOW
apps/three-surface-poc/src/main.test.ts:555 2000 < 5000`. That is the one deferred site the PR body names.

### 3.8 The lane's tools, re-run (in the `lt` worktree)

- `decide.py` reproduced `decisions-546f1ff0.json` byte for byte (`relane/decisions.json`).
- `check_removals.py` reproduced `removal-check.json` byte for byte (`relane/removal-check.json`).
  - This holds the stop condition: the 9 refused removals are the 9 the PR body restores.
- `decide_mutants.py` printed `{"D1": "killed", "D1c": "holds", "D2": "killed", "D2c": "holds", "D3": "killed"}`.
- `check_removals_mutants.py` printed `9 of 9 killed, 2 of 2 controls held`.
- `census_mutants.py` printed 21 of 21 killed, with `selftest passed: 16 sites, every predicate and its negative`
  (`census-mutants-rerun.json`).
  - **M8 is killed for the wrong reason.** Deleting the `push(...)` call breaks the parse:
    `SyntaxError: Unexpected token '}'`. See N1.
  - My valid version of the same mutant (`'setConfig'` → `'setConfigX'` in the callee test) is killed properly. It
    printed `selftest FAILED:` /
    `missing ["packages/x/src/a.test.ts",17,"setConfig","testTimeout",6000,null,0,0]`, and the unmutated selftest
    exited 0 (`census-m8-valid.txt`).

### 3.9 My mutants against the lane's tools

Tool: `tools/lane_tool_mutants.py`; results in `lane-tool-mutants.json`. Each mutant changes exactly one fragment.

| Id | Mutant | Lane checks | Outcome |
|---|---|---|---|
| T1 | `decide.py`: the test threshold set to the default, 5000 | `decide.py` exit 0; `decide_mutants` unchanged (`{"D1": "killed", …}`); `check_removals.py` exit 0 | **SURVIVED.** 6 decisions change: `fixture-directories:296`, `keyboard-sweep-record:59`, `polaris-accessible-names:329`, `:343`, `test-model-fixture:120`, `:131` |
| T2 | `decide.py`: the hook threshold set to the default, 10000 | the same | **SURVIVED.** 0 decisions change on this input |
| T3 | `decide.py`: the hosted-run condition dropped (`hosted_ok = True`) | the same | **SURVIVED.** 2 decisions change: `surface-routes:313`, `:328` |
| T4 | `citation_audit.py` input: `keyboard-sweep-record:59`'s record rewritten so it names only another test of the file | `match_record` | **SURVIVED.** The verdict goes from `"before": "test"` to `"after": "file"`, accepted |
| T5 | `citation_audit.py` input: `opening-index:316`'s record names `polaris-opening-index.test.ts` instead of `.browser.test.ts` | `match_record` | **SURVIVED.** `"after": "file"`, on the other file's name |
| T6 | `check_removals.py`: a hook held to twice its threshold | `check_removals_mutants.py` | **KILLED.** It printed `8 of 9 killed, 2 of 2 controls held` and exited 1 |

The brief's three examples:

- **A census that misses an options-object timeout.** The lane's census-mutant suite kills it for `{ timeout: N }`. The
  shorthand `{ timeout }` is a live blind spot of the tool, but no instance of it exists in the repository (§3.2, N2).
- **A `decide.py` that uses 5000 for tests** is T1, and it survives.
- **A citation audit that accepts another site's measurement in the same file** is T4, and it survives.

### 3.10 Ruling 7

`tools/ruling7_sweep.py` covers every `.json` under `docs/evidence/syzygy-bpyt-4-31/` at `f44cd65d`
(`ruling7-sweep.txt`). It printed `json files 70 records with timed runs 52 timed runs 258 without load1 0`.

- **The host record.** `host.json` holds it: `"logicalCpus": 12`, `"cpuModel": "AMD Ryzen 5 3600 6-Core Processor"`,
  `"node": "v24.6.0"`, `"vitest": "3.2.7"`.
- **Host stubs.** 52 duration records also carry a two-field `"host": {"cores": 12, "node": "v24.6.0"}`. It agrees with
  `host.json`. See N12.

### 3.11 Other records

- **Rule 11** (`rule11-sweep.txt`). Of the 70 JSON records:
  - 64 have a top-level subject or commit key;
  - 69 carry a 40- or 64-hex token;
  - `cited.json` carries neither (N10).
- **Exit codes in the duration records** (`duration-exit-sweep.txt`).
  - `cap1-system.hooks.json` has exit codes `[1, 1, 1, 0, 1]`, though every one of its 49 recorded tests passed in
    each run (N9).
  - `cdp-browser.browser.test.tests.json`'s run 5 exited 1. Its test "closes and drains…" has `"status": "failed",
    "durationMs": 15824` at load1 118.9–138.24. That is the drain flake the PR body names.

### 3.12 Repository checks at `f44cd65d`, in the clone

- `npm run typecheck` exited 0 (`typecheck.log`).
- `python3 scripts/check_governance.py` exited 0 and printed `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not
  asserted` (`check_governance.log`).
- `python3 scripts/check_quotations.py` exited 0 and printed `OK    QC-1  a quotation beside a path:line locator was
  said by that file — 37 quotations examined in 18 of 952 .md files scanned … 0 findings` (`check_quotations.log`).

### 3.13 The lane's records against Vitest's CLI

[Observed] In `node_modules/vitest/dist/chunks/cli-api.DVe0nWUx.js` (vitest 3.2.7), `overridesOptions` lists
`"testTimeout"` and does not list `"hookTimeout"`. The negative control in §3.4 confirms it.

The lane's records give, for example, `"npx vitest run --project @syzygy/polaris-dossier
packages/polaris-dossier/src/no-egress.test.ts --reporter=<tmp>/hook-reporter.mjs --testTimeout=600000
--hookTimeout=600000"`. In a project run, that `--hookTimeout` never applied (N5).

### 3.14 Limits from load

- **My conditions.** My runs are single-file runs at load1 22–63. The lane's full-suite runs were at 38–72, and its
  alone runs reached 143.
- **What a pass shows.** A pass in my runs is weaker evidence that a removal is safe than the lane's full-run bounds.
- **What an exceedance shows.** An exceedance in my runs, as in F1, is direct evidence against a removal.
- **Moving load.** Load moved during the session, so A/B comparisons interleave base and head round by round.

### 3.15 What I did not run, and process disclosures

- I did not run the full vitest suite or the canonical battery. Vitest coverage of this head rests on the hosted `node`
  pass (run 40465393936).
- I did not re-count the lane's suite-wide 5,411 tests. [Unknown] My token diff shows that no test registration
  changed in the 31 files.
- `bd` was unreachable when I came to re-quote the acceptance criteria:
  `Error: failed to open database: failed to check if database "syzygy" exists on server dolt.parrot-hen.ts.net:3307:
  invalid connection`. §6 judges the outcome as the brief restates it.
- **A breach of the brief's constraint.** I once ran `grep` against my own session transcript under `~/.claude/projects/`
  to recover a command line, which the brief's "nothing under `~/.claude/`" forbids. ugrep rejected the pattern
  (`exceeds complexity limits`) and returned no content. I did not retry, and nothing from it is used here.
- After deleting the clone, I ran `reason_check.py`, `below_default.py` and `ruling7_sweep.py` against
  `/home/tze/GitHub/syzygy` through `git show`, `git ls-tree` and `git cat-file` at the stated commits. Those are
  object reads only, with no checkout or worktree edit.
- I created one stray file, `/tmp/r537-m.txt`, and deleted it at once.

## 4. Findings

### F1 — blocking: `dossier-cap-measure.test.ts:12`'s removal ran past ruling 1's hook threshold

- **Severity:** blocking under the brief's verdict rule ("a removal whose worst run exceeds the ruling's threshold").
  It also bears on the coordinator's ruling 1, "All 8 hook removals stand", which rested on the lane's worst full-run
  figures of 2018–4750 ms.
- **Evidence** [Observed], §3.4:
  - At the head, under a config with `hookTimeout` 5000, round 3 of 5 failed:
    `Error: Hook timed out in 5000ms.` at `dossier-cap-measure.test.ts:9:1` (`beforeAll(async () => {`), with
    `"hookMs": 5107`, at load1 46.40 → 54.89.
  - The base value was `}, 120_000);`, and the head has `});`.
  - Across all my runs the hook exceeded 5000 ms in 1 of 33 observations. The other 32 were at most 1873 ms.
  - The lane's own worst figures for this hook were 933 ms alone and 3313 ms in a full run.
- **Failure scenario:** under the load this host routinely carries (the lane recorded load1 up to 143), the
  `beforeAll` runs past half its default. By ruling 1's own rule that keeps the site. The one observed stall stayed
  under the 10000 ms default, so I did not see the removal make the file fail at the default. [Observed] The ruling's
  margin is what the stall consumed.
- **Proposed fix**, either of:
  - **(a)** Restore `}, 120_000);` at `apps/three-surface-poc/src/polaris-generation/dossier-cap-measure.test.ts:12`,
    with a one-line reason that cites a retained measurement of this hook's exceedance. Ruling 5 forbids a resized
    keep, so it gets its base value back, as the 9 stop-condition restorations did. Re-measure into
    `durations/dossier-cap-measure.test.hooks.json`, or cite this review once it is stored. Then update the PR body's
    removal count (49 → 48), its hook list and its outcome table, and re-run `check_removals.py`.
  - **(b)** The coordinator re-rules, with this measurement in hand, that a single stalled observation does not refute
    a removal. That would be a change to ruling 1's reading, for the coordinator or owner.

### F2 — blocking: `production-reobserve.test.ts:160` is kept on another test's measurement and is not counted as a residual

- **Severity:** blocking under the brief's verdict rule ("a kept reason that cites a measurement of a different site
  and is not counted as a residual").
- **Evidence** [Observed], §3.6:
  - The site's reason is the comment on the shared `PRODUCTION_BUILD_TIMEOUT_MS = 60_000` at
    `production-reobserve.test.ts:67–71`: "Measured worst case 18.0 s under the parallel-load protocol (syzygy-4d15,
    docs/evidence/poc-test-timeouts-2026-10-03.json)."
  - That record carries the title "re-evaluates an unchanged repository twice: two distinct named identities, the
    first result unchanged (syzygy-u05.2)" 0 times.
  - It was last written at `f5e31660`, an ancestor of `c069f5f5`, which added the test.
  - The audit's evidence row for `:160` is `"measured": "file"`, with `"name": "production-reobserve.test.ts > keeps the
    production probe identity bound to the captured observation instant", "duration": 6`. That is a different test,
    measured at 6 ms.
  - The site has a test name of its own, so ruling 6 allows only a same-site measurement by test name. "Anything else
    becomes a counted residual."
  - The PR body says the same in its own words: "`poc-test-timeouts-2026-10-03.json` names four of the file's tests,
    with durations, and not this one". Yet it reports "**Counted residual** | **2**" and lists the site under "Measured
    by its file only".
  - Mutant T4 shows the mechanism: `citation_audit.py` turns a test-name match into an accepted `"file"` match when the
    record names only another test of the same file.
- **Failure scenario:** a test with no measurement of its own keeps a 60 s budget whose reason reads as measured, and
  the residual count understates what this bead left unmeasured. Any later site in the same position passes the audit
  the same way.
- **Proposed fix**, both parts:
  - **(a)** Either measure `:160`, for example 5 alone runs with load1 into
    `durations/production-reobserve.test.tests.json`, and add that citation to its reason. Or count it as a third
    residual: say so in a reason on the site itself, as the other two residuals do, and change the PR body's outcome
    table to 58 / 13 / 3.
  - **(b)** In `docs/evidence/syzygy-bpyt-4-31/tools/citation_audit.py`, let a `"file"` match count only for a site
    with no test name of its own (hook, suite or config). A titled test with only a file match becomes a residual. Add
    T4 as a kept input mutant, re-run the audit and retain the new `citation-audit.json`.

### Notes (non-blocking; each is written to be actioned cold)

- **N1 — `census_mutants.py`'s M8 is killed by a syntax error, not by the selftest.**
  - Evidence: `census-mutants-rerun.json`, M8, `SyntaxError: Unexpected token '}'`.
  - The predicate is in fact guarded: the valid mutant `'setConfig'` → `'setConfigX'` fails the selftest with
    `missing [...,17,"setConfig","testTimeout",6000,...]`.
  - Fix: change M8 in `tools/census_mutants.py` to that rename. Have the suite fail any mutant whose output carries
    `SyntaxError` rather than counting it killed. Retain the re-run.
- **N2 — the lane's census misses 5 forms that no live file uses.**
  - The forms: `{ timeout }` shorthand, `c ? describe : describe.skip` and `c ? it : it.skip` aliases, `let` aliases,
    and `it['skip']`. Evidence: §3.2, `tools/fixture/forms.test.ts.txt`.
  - Fix: add the five to `timeout_census.mjs`'s selftest fixture with the predicates that catch them, or list them as
    known exclusions in its header.
- **N3 — `decide.py`'s threshold constants and hosted-run condition have no mutant.**
  - Evidence: T1, T2 and T3 survive while `decide_mutants.py` prints the same five verdicts.
  - Fix: add mutants to `decide_mutants.py` that assert at least one test site whose worst lies between 2500 and 5000
    stays kept (e.g. `keyboard-sweep-record:59`), and that `surface-routes:313` stays kept on its hosted bound.
- **N4 — `citation_audit.py` accepts a file match on a different file that shares the stem.**
  - Evidence: T5.
  - Stem collisions do exist: 10 basenames are shared once `.browser`, `.system` and `.live` are dropped, among them
    `cdp-browser`, `orrery`, `draft-preview` and `test-artifact-verification`.
  - No live instance: none of the 14 file-measured kept sites sits in one of those files. [Observed, over the 10
    groups at `f44cd65d`]
  - Fix: match the full path, or basename equality, never a substring. Add T5 as a kept mutant.
- **N5 — the lane's recorded commands say `--hookTimeout=600000`, which Vitest 3.2.7 does not apply in a `--project`
  run.**
  - Evidence: §3.4's negative control; §3.13.
  - Effect: hooks were measured at their in-file or 10 s default budgets, not 600 s. No recorded duration is wrong as a
    duration, but a hook past its in-force budget would have recorded a failure rather than a time.
  - Fix: say so in the records' `text` field or the directory README. Have `measure_vitest_hook_durations.py` pass the
    hook budget through a config file.
- **N6 — the lane's numbers are at `546f1ff0` and pre-merge, while the subject's base is `f7477f52`.**
  - The removal evidence is at `1785a905`, whose parent is `546f1ff0`. The PR body's line numbers count at `546f1ff0`,
    and `no-egress`'s three sites sit one line lower at the base (§3.2).
  - The bundle that `no-egress`'s hook builds gained the `@syzygy/support` alias in the merge. My head runs cover the
    merged code: worst 855 ms.
  - Fix: state in the PR body that the line numbers count at `546f1ff0`.
- **N7 — three remaining hook removals sit close to the threshold under load.**
  - `polaris-accessible-names:187`: mine 3722, the lane's full run 4750.
  - `trajectory-narrowing:32`: 1724 and 4180.
  - `orrery:24`: 2848 and 3391.
  - F1 shows the margin can be consumed. The PR body's follow-up already names 4750.
  - Fix: keep that follow-up, and re-measure these three in the next timeout cycle.
- **N8 — `pipeline-demo:73` is measured by its test name, and the audit labels it "file".**
  - The record's `postChangeVerification.command` filters to the site with `-t 'README command'` (§3.6).
  - Fix: record the reading in `cited.json`, or teach the audit to read a `-t` filter. The count becomes 59 by test
    and 13 (or 12 after F2) by file.
- **N9 — `durations/cap1-system.hooks.json`: 4 of 5 runs exit 1 with every recorded test passing, and the record does
  not say why.** [Unknown cause]
  - Both config-level reasons (ruling 4) cite this record.
  - Fix: record each run's failing reason, for example from the output tail, or re-run until an exit-0 set exists, and
    say which.
- **N10 — `cited.json` names sites as `path:line` with no commit for its line numbers (rule 11).**
  - Fix: add the commit, `546f1ff066e2ffef749c757cdb4621336039113b`, as a top-level field.
- **N11 — the PR body's "These 17 sites are in the three files #532 changes" is inexact.**
  - #532 (`9e00252a`) changes 10 code files, and 4 of them carry base sites. The fourth, `self-corpus.test.ts`
    (2 sites), is worked here, not deferred. No #532 hunk touches a site line in any of the four.
  - Fix: reword it, for example "the three #532 files whose timeouts #532's restructuring would move".
- **N12 — ruling 7, "the host is recorded once, in its own record".** `host.json` is that record. 52 duration records
  also carry a two-field host stub, `{"cores": 12, "node": "v24.6.0"}`, consistent with it.
  - Fix: the coordinator says whether the stub is inside the ruling. If not, the generator should write a pointer to
    `host.json` instead.

## 5. Every changed output

- **Product outputs: none.** [Observed]
  - 0 of 115 files are product source; the split is in §1.
  - No rendered byte, wire format, refusal string or product exit code changes.
  - `check_governance` reports `0 FAIL (53 checks)`, and `check_quotations` reports 0 findings.
- **Test runner budgets: 49 sites now inherit Vitest's defaults.**
  - 41 test sites (43 tests) move to 5000 ms.
  - 8 hooks move to 10000 ms.
  - One file-level constant goes: `const T = 30_000` in `durable-lifecycle-generate.test.ts`.
  - The token diff, the census difference and `removal-check.json`'s holding rows all count 49.
- **Test outcomes.**
  - Hosted: `node pass 4m33s` at `f44cd65d`.
  - Locally: no removal produced a test failure in 60 threshold runs. One hook exceeded the ruling threshold (F1).
  - No test registration, title or assertion token changed in the 31 files: Tests +0 ~0 −0 in those files.
- **The config file.** `packages/cap1-system/vitest.config.ts` changes comments only, as §3.3 shows.
- **Evidence.** 84 files are added under `docs/evidence/syzygy-bpyt-4-31/`. They are records, not authority, and no act
  manifest carries any digest of the 31 changed files.

## 6. Verdicts

The acceptance criteria are judged as the brief restates them; `bd` was unreachable, as §3.15 records.

- **"Each surviving explicit Vitest timeout carries a one-line reason naming why."** Not met for 1 site, met for 73 of 74.
  - 74 of 74 kept sites have a reason with a citation (`reason_check.py`).
  - `production-reobserve:160`'s reason names a measurement of other tests (F2).
- **"A timeout no measurement supports is removed."** Not met for 2 sites, met otherwise.
  - 49 were removed.
  - `dossier-cap-measure:12` is now refuted by a measurement (F1).
  - `production-reobserve:160` has no measurement of its own, and is neither removed nor counted as a residual (F2).
  - The 2 counted residuals are kept by ruling 6.
- **"Behaviour-preserving: no assertion or title changes."** **Met.** Token diff: 0 violations; 6 of 6 mutants killed.

The coordinator's rulings:

1. **Not met for 1 of 49 removals** (F1). In my runs the other 48 stay under 2500 ms (tests) and 5000 ms (hooks).
2. **Met.** My census counts 140 at the base, equal to the lane's corrected recount. I did not re-run the older
   predicate behind "93 in 28" [Unknown].
3. **Met.** 0 of 123 below default; the control finds `main.test.ts:555`.
4. **Met.** Both config properties are kept, each citing `cap1-system.hooks.json` with durations. N9 is a note on that
   record.
5. **Met.** 0 kept values changed: 0 token violations, and the resize mutant is killed.
6. **Not met for `production-reobserve:160`** (F2). N8 is a labelling note.
7. **Met, with N12.** 258 timed runs in 52 records, 0 without load1. `host.json` holds the host.
- **The stop condition is named in the PR body and reproduces.** `check_removals.py` reproduces `removal-check.json`,
  and its mutant suite printed `9 of 9 killed, 2 of 2 controls held`.

**The class ruling is none** (§2). I agree with the PR's proposal, including both contested places. Nothing a gate
accepts or refuses changes under GP-Q0.

**Verdict: REVISE.** F1 and F2 each meet a REVISE condition of the brief. Each needs either a change to the reviewed
bytes or a coordinator or owner re-ruling.

## 7. Test quality

- **Assertion integrity holds.** No assertion, title or registration token changed in the 31 files. The only token
  changes are timeout arguments and one constant (§3.3).
- **Net test delta (test-rigor #10): +0 ~0 −0 in the changed files.** [Observed] Suite-wide, the lane's 5,411 per side
  is [Unknown] to me. No other test file is touched [Observed], so the PR's suite-wide delta is 0. [Inferred]
- **Determinism (test-rigor #6, "A test that fails intermittently is worse than no test… never retry-until-green").**
  - The six default-timeout failures exist at the base; one reproduced at base only (§3.5). The `cdp-browser.browser`
    drain failure is recorded in the lane's own run 5.
  - All are intermittent, and this PR neither causes nor fixes them. It names them as follow-ups, which is the right
    scope for a timeout-reasons bead. Under #6 they need fixing or quarantine in their own beads.
  - Removing budgets from hooks that sit within 25–40 % of the threshold under load adds intermittent-failure exposure
    (F1, N7).
- **The lane's tools are good, and their gaps are in their mutant suites.**
  - Every lane tool I re-ran reproduces its retained record byte for byte.
  - The gaps are the ones above: N1, N3, N4, and T4 under F2. Tools that decide a removal or accept a citation should
    have a mutant per constant and per condition, as `check_removals_mutants.py` does.

## 8. Cleanup

Removed:

- the `trial`, `lt` and `base` worktrees (`git worktree remove --force`);
- the scratch clone `rev-537/clone/`;
- the TMPDIRs `/tmp/r537-1` … `/tmp/r537-8`, including the census fixture repository `/tmp/r537-7/fx`. The fixture's
  two source files are re-typed under `tools/fixture/`; its `packages/y/vitest.config.ts`, with three config
  properties, was not retained.

Deleted as over 300 KB, and re-creatable with `node tools/tokens.mjs <repo> <commit> <typescript.js> <31 paths>`:

- `tokens-base.jsonl`, sha256 `9b00d2fd608d67c67353db1b098705f21ded8fc1c1008177d41ce4709a415b5a`;
- `tokens-head.jsonl`, sha256 `543da66d426df17faa94525b858a56198ef564ffa1ae006c0e7e5d340a8038e1`.

No kept file is over 300 KB. Every kept tool and result file, with its sha256 (paths relative to `rev-537/`):

| File | sha256 |
|---|---|
| `all-keys.txt` | `d4e60a2f4a837493ff21467cfc94225fa442516277eab14c8f913c4b47bca4fa` |
| `below-default.txt` | `97bb1f8200eea0a6610db5b8d2a0c0c05e538a7000ff2e5f2bb0a36fce92b5b7` |
| `census-compare.txt` | `661ddfe0dcc386a9a729d9f6bd74e1d7ffba84366a266a346bcd900eeb6dd8b5` |
| `census-m8-valid.txt` | `dde236d3200df217a2f9d34a2693273f721a1687ccaa66dc9e133b781bb5bf08` |
| `census-mutants-rerun.json` | `4672f65418749af5fa951e0343d1822da84dab1b74438933ba63626de0dc6891` |
| `check_governance.log` | `93968216bb3e8bbde8dcd87773415f242add0b59932b0115b1026cb11be35479` |
| `check_quotations.log` | `1868cba498568e9b17dc851e4827a35a6afba5e06cdbda25be012b2d5d6fdde0` |
| `citation-audit-rerun.json` | `f94f1d09ff0d919778288a3313f66c843cc30abdeb116e9cc74c2ca369f40101` |
| `cite-lookup-all.txt` | `9d8583fdadb3cbe8695c80656bc4ea354927504ac69f86e146dd9d4e41f6f3ee` |
| `cite-lookup-sample.txt` | `c1312ad1a0d7019eaa5f5dbcc2cc723cb878141fd9603f88481972b7a6e88f25` |
| `cite-summary.txt` | `ef29ba3fd078134a53449e60a2bb0925705ca227516f73f963ea553eae9be673` |
| `cli-hooktimeout-control.txt` | `8c4602a5cf2ad78ce8fbf8a0060347dcf2abe4806f533694b5c7228d28441fb6` |
| `code-files.txt` | `aedf61d24a3a8072ac594b78a30a90117549da72f8a447a8d13e343918835d76` |
| `code.diff` | `17b2c14dc3407f4274e2a9647c0d9080666bcfadefbccf31717bdf51875ddc2d` |
| `config-strip.txt` | `93ef125751173977005f5c7fd6e2f2daebda82c07124ca7a77efd8c558b65bdd` |
| `dcm-summary.txt` | `d2a7ba3bc5b24fcb72cf4fb229a4766234e24fb6496712c248d649a6b6bf79d7` |
| `duration-exit-sweep.txt` | `69843ae20de180ad76c13bafc3e396182d4bad91902abd5f4076f8b626343e2d` |
| `excl.txt` | `ffd00c6f552f6e62c7992705d8a662fa694f5aee452e11b671f6d35677f21d39` |
| `fx-lane-census.json` | `4827ee9df7f88016fac4d820b6fd85ddb05ab799a5f08f6b450bb0f889ca3f54` |
| `fx-rev-census.json` | `20dbb5b33b57f869352a94d5d288211cafc936d9b4fb9a994d57d7a336e4e0c4` |
| `lane-json-list.txt` | `4a14725bcc7a498040351ec1c996deed6341c5e1aebd0263a9f24ec874303b98` |
| `lane-tool-mutants.json` | `a5f7fd7bdbd143b0c8226fcdffde88d4776e9d319ade3b62e13ec7a5a6546325` |
| `main-files-now.txt` | `6495f548605f02f65cd84bbb89cb2732297f1f31cd8b943465dd04ab1674ab6d` |
| `main-files.txt` | `6495f548605f02f65cd84bbb89cb2732297f1f31cd8b943465dd04ab1674ab6d` |
| `npm-ci-base.log` | `b27f1acc7044f070523b3cb9b2a83cb9a636cec28c32555bf79e79eed506a81d` |
| `npm-ci-head.log` | `8347f09632343ef6e7f6d52225e233d22852cf7590ec55c73d94b135faa855b1` |
| `pr-body.txt` | `a734728497e4fd096f180a2e27f4b196f3cf0e5f7f4c052d6d8f786f5a518723` |
| `pr-files-sorted.txt` | `8cea86f4d14b59d32574cafc6b0740dfd5859cacb37366f68d23002caa6bbf93` |
| `pr-files.txt` | `8cea86f4d14b59d32574cafc6b0740dfd5859cacb37366f68d23002caa6bbf93` |
| `pr532-code.txt` | `72651941680bfcd2f456bbe30c45d07765b76196b94bbc8950600eb8e307b33a` |
| `reason-check.txt` | `050570bf48b069bf1d1fa187f70e53b29cdcd413ae418ed69d1dbb97fb8f91c9` |
| `relane/check.out` | `9ab41e84fea92eb3fe7c5634208ee9c0c9966aa31a85937bb0712b8a5af8ac08` |
| `relane/decide-mutants.json` | `773f042d791c965b90b65c434e2bb256c727ba0e11d49b93e74bb3ff5bf8282d` |
| `relane/decide.out` | `64c8d770415b070e45bf9c14b1cfe4c6229628ee8d740904ec08a8df8df50cf7` |
| `relane/decisions.json` | `03f0da52c62ee79a1844b3d8a9273641dc01fd9f8912ea6426f5a973b1f6a92d` |
| `relane/removal-check-mutants.json` | `87ee74ed1ec863855e9f44fa7b37e8651dd686ada55072725e582e9c94bc06c7` |
| `relane/removal-check.json` | `47683e91c5b229c8dcd99650203c4ca9c6c95da650803a41ebe8389ca3e3e498` |
| `removal-analysis-head-thr.json` | `42ac301b168e89ea961c3d4c490323c78e9f567587dfc59d1790b7b4a2c20774` |
| `rev-census-546f1ff0.json` | `6ee9e96e1a996442056c95ed9752b23505f9e93fed76cee074af9b674c0fce90` |
| `rev-census-a088f1ca.json` | `abb298c99ef24d4d8f9578cfeeb3a4a5787e45f9b7c0fa872621827e5cd7a794` |
| `rev-census-d38d7a3c.json` | `5ffae203e4be6952b1a08ae60af66c93607779916e9197b3042075e484c8c4d8` |
| `rev-census-f44cd65d.json` | `a679dc42d90f0409159dc37443190bd6c929ac672bd8e9b2ca9908e0754dfb68` |
| `rev-census-f7477f52.json` | `da1002bef9a31b0189771af70539c7c698abab91c9b0a4c87c31b25ac1b10448` |
| `rule11-sweep.txt` | `51d2e0331acf6c00cfd9bd1f8890ab50ecd872f92f824cfcc2a0200be8a63e18` |
| `ruling7-sweep.txt` | `eab2019e52fbc5fbe8c155337f75867f1d8b19c417d602f7b41ae152509549bf` |
| `runs/dcm-progress.log` | `69dba0ed6a76ed5d0ffff8be700561e54e3a2f13c7dffc87b2fe8415db813b54` |
| `runs/dcm/dcm-base-r1.json` | `3fb6a6a80a5ebc9cd6ed69995a76f9b2b32ae94f66544aa85a921dfdc3c8107d` |
| `runs/dcm/dcm-base-r2.json` | `c533ecdf63562a12d835269c2b9bc75bd150f7abc29e6becf17624e7788eab46` |
| `runs/dcm/dcm-base-r3.json` | `9ed24fd51be184f55da150fda2606d82269d1b01f5573c2f66d6abe7826177c6` |
| `runs/dcm/dcm-base-r4.json` | `4a8e74e2b3a0cb2157781d664b7fac0cfeabc51012b9f5a0c02ec07ad43e344c` |
| `runs/dcm/dcm-base-r5.json` | `3ebb6a4d677ceb8e9f186cce17213977c3f51d2a330556adf0ad4ca6283229ba` |
| `runs/dcm/dcm-base-r6.json` | `f9f9d6329c4a3675a88718f23c4e53bc056d0b950463a59662fe3d3502ebde58` |
| `runs/dcm/dcm-head-r1.json` | `b7b6f714fe73dcb446bc587e8828670353191880ee727da386f7506db3dc526e` |
| `runs/dcm/dcm-head-r2.json` | `095800e3b07a8682f4448574e77a0283d0717a71c56b26d4083e795575b08822` |
| `runs/dcm/dcm-head-r3.json` | `1f1195acbe5df0ba6183b98251cae39e840b05f97ff01487f34fd6716c11e991` |
| `runs/dcm/dcm-head-r4.json` | `ed3b49d936c60b3350508093617456502a4370313066542f4b9edb6b5f8291dd` |
| `runs/dcm/dcm-head-r5.json` | `da21b0b8cc659527d900cfe81c159e0d463bdd43c6c49d5046957ddbe2ebce57` |
| `runs/dcm/dcm-head-r6.json` | `a92c21883b941fbf0ef900d3294a46c0c7192d4e204a97f6558141be85f00837` |
| `runs/dcm/dcm.jsonl` | `8cdbda214fa4efdd1c77dea81e3371caaf6d829a5e5eef9615d8dd5a8ccddf66` |
| `runs/dcm2/dcm2-base-r1.json` | `cb6e4aa9bcd8485f92450b9c8f8ae1009f0d4d8485c8c984c681e5d737f733e1` |
| `runs/dcm2/dcm2-base-r2.json` | `de09d0a3612b74af9c3f9773c0d2853742925e0653c3c6459c35f87a39a2b383` |
| `runs/dcm2/dcm2-base-r3.json` | `2088732c538e5121bb85b33b7388a3210b0e40179f19b942b93072d4e2e4e62e` |
| `runs/dcm2/dcm2-base-r4.json` | `32093d6f1f0e72243a0c35d304da616cb9dce5157b7d9b0fad2226471c8c6aa5` |
| `runs/dcm2/dcm2-base-r5.json` | `c520c5727f77ef2888e04d1c255bd486d38282f24f0bb104ed9407d61b92f946` |
| `runs/dcm2/dcm2-base-r6.json` | `dcbaaf8e4bbfa213c814a019b5eee3ba2ea7ac48a9d204b934dbf8af507699d4` |
| `runs/dcm2/dcm2-base-r7.json` | `75759b753697126f16d6e252a516a67f65afc87532f12389a14a00311bc2f3e6` |
| `runs/dcm2/dcm2-base-r8.json` | `a38ee061860ddefb1ca2b3aeaef19ead4bcd051ab547223bd8edcded20881619` |
| `runs/dcm2/dcm2-head-r1.json` | `22252a016c828bb696ce27c9d429f8489b6a59137e599e25ea4eea20a0064abd` |
| `runs/dcm2/dcm2-head-r2.json` | `73d61fffb4788ed1f7ba2166da32e907b7260a61f6d494f2bb93ca079d05a09a` |
| `runs/dcm2/dcm2-head-r3.json` | `6546575084806dd4d241fee1967fc8edad498a648bb15f083cff5850c325bd24` |
| `runs/dcm2/dcm2-head-r4.json` | `c52d2064b3aac8bd30ceadbc5c97f1cb1c145cdab82e7979ccbede9019e1f47c` |
| `runs/dcm2/dcm2-head-r5.json` | `e16cd248f49bd1ba37ce14e4dc8abb0974f641c0057e7df4b8e65cc726b9ed8a` |
| `runs/dcm2/dcm2-head-r6.json` | `ab3b30cb60ed0fd5905a4378347c147421a77acc50924bc030c1a3acab3ceb14` |
| `runs/dcm2/dcm2-head-r7.json` | `a0d882510ba1e6e2351d0634668a9495ca4efc1d0adc00f9406cbcc551e4e051` |
| `runs/dcm2/dcm2-head-r8.json` | `42a7c0d159b11c7e358ef3b743ad84093c39209a07e453a9887c4237343dd79b` |
| `runs/dcm2/dcm2.jsonl` | `c3fb0313df61913156e8e3beeea59b2aa4856620769a8b9ab7d0991bb53d8319` |
| `runs/removal-progress.log` | `e1dbb58892abb61448d42fe09e9eb5c5f51fe6304c82cffc46cbe636de4eb01e` |
| `runs/removal/head-thr-r1-cdp-browser.test.json` | `7945b6b798b7829e201a96617110236ca0fd0a37c914c3327ad4e273a815b1dc` |
| `runs/removal/head-thr-r1-dossier-cap-measure.test.json` | `b98e4c69271f6d5438578ae9633d00babccfd2f16d6062aadcf65e16abbdb66e` |
| `runs/removal/head-thr-r1-durable-lifecycle-generate.test.json` | `2309867323b019d61566fedf15dbeca828e8499e22b4939b99c019803b7b874a` |
| `runs/removal/head-thr-r1-fixture-directories.test.json` | `e87be53aad3fafe4d9972ff1de3063ac6b8dd8632201ab7ff75f8360b4a13814` |
| `runs/removal/head-thr-r1-governing-intent-sweep.test.json` | `a29ac46411e0e5235153d8117f6887f6394e1a8a087c7670188bb0a56826a186` |
| `runs/removal/head-thr-r1-no-egress.test.json` | `f74dcdbac24e9331d9bf59452ae4ab593aeb748001dbcfb9d8dc2ee066471b7e` |
| `runs/removal/head-thr-r1-orrery.browser.test.json` | `f0ed821da41fc6d3d4e97702f3bef07e2c7a023853d97bd23739f31dc17e6fe4` |
| `runs/removal/head-thr-r1-polaris-accessible-names.browser.test.json` | `c8be910ead24cce83ab2109265da4a06f993555a03f3d17bdec16b0ba646bb8c` |
| `runs/removal/head-thr-r1-polaris-opening-index.browser.test.json` | `2198fd5744424043ce70eb5cc792c17fd0864f6d6e8a8aeaacbeb90ca04860f3` |
| `runs/removal/head-thr-r1-polaris-reconciliation.test.json` | `9050b833a84123360a11bdb5fe7014d6e80a7380e81c551373342569fe3405f2` |
| `runs/removal/head-thr-r1-trajectory-narrowing.browser.test.json` | `ba14ed58193d3e42576403029ed1e6a105189fe304a795a539e302fa80ef4763` |
| `runs/removal/head-thr-r1-unknown-route-sweep.test.json` | `6ad7bcf932ba59ac5437e23cf0998ab78e9275f85cfcd1ab6197f0c4a195de8d` |
| `runs/removal/head-thr-r2-cdp-browser.test.json` | `8d8f9fb55bcb8a5c9dcdc19b5cc48eacc6c23f4640030d90deb6b49f5f63ede0` |
| `runs/removal/head-thr-r2-dossier-cap-measure.test.json` | `6e7c0d07c72f95b112e541f9030cf29573dfb7a89bf63457861e9c2cb703fcfe` |
| `runs/removal/head-thr-r2-durable-lifecycle-generate.test.json` | `156ec704bff4ea5872c99969f01ab34f1ebc31f89a87d7c807c94b9603d0c5df` |
| `runs/removal/head-thr-r2-fixture-directories.test.json` | `22f979a52218d2c7f908738b8b16130dbc46b3ddd14814123bd6db5fe63faf45` |
| `runs/removal/head-thr-r2-governing-intent-sweep.test.json` | `d24e24e1dcf761e30e191e6f8561fa764186c401a5c0e81b46b8184195e6f9b1` |
| `runs/removal/head-thr-r2-no-egress.test.json` | `4b6fafd01ed84d4715a768122a310d2e475f7c35b970cd8309eafcf7978838be` |
| `runs/removal/head-thr-r2-orrery.browser.test.json` | `593ea1ad05a2fea52fbef83a28e7c8203ef0981bfa9de7fc005b9d5658a76c3a` |
| `runs/removal/head-thr-r2-polaris-accessible-names.browser.test.json` | `506a38d935d255cb7c44fb42734312a770682578a6671b4d4625e3a3fe0a4277` |
| `runs/removal/head-thr-r2-polaris-opening-index.browser.test.json` | `dc8dd642bd51861f9d18446f7b8d3b5baedfaf75add1cb67a58688f158bc9b33` |
| `runs/removal/head-thr-r2-polaris-reconciliation.test.json` | `faf8a08ed64f0cf14da31db5068970d8e26603829d66860c6dab9e36c744efff` |
| `runs/removal/head-thr-r2-trajectory-narrowing.browser.test.json` | `42a85b24f587696c85d67b124b559890875930115c259b93be0936d0e3bbd8fb` |
| `runs/removal/head-thr-r2-unknown-route-sweep.test.json` | `4c1dd1e13b7560524260a4195deae61f0e5a8eb392673148a473971083207043` |
| `runs/removal/head-thr-r3-cdp-browser.test.json` | `7d8cdbeb8ad83787c3d65c9a7c08ded1b765bd28a37ad89fa35fbb7508f3c2bc` |
| `runs/removal/head-thr-r3-dossier-cap-measure.test.json` | `779defd41b6d45a65aae48cfdbedd6de4dddf8c229a33d1f8728f9c38d49d76a` |
| `runs/removal/head-thr-r3-durable-lifecycle-generate.test.json` | `559a6c6d01a7f0875c996dc397611eb65b17dc4884f58a52c28ebec3893e41ba` |
| `runs/removal/head-thr-r3-fixture-directories.test.json` | `d8f9dd0a62814ed8f963812b6ee591c41843f99ace49be32ff6c3825b3a40ae8` |
| `runs/removal/head-thr-r3-governing-intent-sweep.test.json` | `e82be606797f0185e2f6f618dd692eadeec7c135aad52bfb6ec0636b68319ccb` |
| `runs/removal/head-thr-r3-no-egress.test.json` | `613f2f6902896b98c7c3925b4a86ed4424c02ce6653e7322a9109c8bc54caf8b` |
| `runs/removal/head-thr-r3-orrery.browser.test.json` | `65adafd922e6ed6061639fa660db58cc9d59542789275f04fdf32ad1b8e6453d` |
| `runs/removal/head-thr-r3-polaris-accessible-names.browser.test.json` | `795057a0e386df9d79b2bf0400929642dd79915fe3612777072dd699508f929d` |
| `runs/removal/head-thr-r3-polaris-opening-index.browser.test.json` | `adb72ebda47dd1ae031c01412de0aab842c8c26c822e957705ef9072880bc348` |
| `runs/removal/head-thr-r3-polaris-reconciliation.test.json` | `0aef085078d4a647650b15c8efda2226489a2d30a2bf0830c39eb44739ee312d` |
| `runs/removal/head-thr-r3-trajectory-narrowing.browser.test.json` | `7b13a3c43f08ae8547874d45d5720f872f3ac94a9ca69275ffdbf874bb348710` |
| `runs/removal/head-thr-r3-unknown-route-sweep.test.json` | `bef70fc4873720a177ee91636dcb71f82cf15eeb0609a2cbbfde4449ebdf8643` |
| `runs/removal/head-thr-r4-cdp-browser.test.json` | `717001a0ff0c451ba9ddbc884c88d93a2f7fd0a464e7a5ec860ffc278a32b495` |
| `runs/removal/head-thr-r4-dossier-cap-measure.test.json` | `8155ffabd5ac1a6fc82fafd1c7c40a08d79591d229ef03a0026cbe23738b228b` |
| `runs/removal/head-thr-r4-durable-lifecycle-generate.test.json` | `8a66ea632dbd161b375d78d8e82205e36de7191da13be87fc7a065c6cfc94f25` |
| `runs/removal/head-thr-r4-fixture-directories.test.json` | `d33f5fef66c124e48bbed7688945419e21a8b93d6cacb41f7c1a92a8c73d24c7` |
| `runs/removal/head-thr-r4-governing-intent-sweep.test.json` | `215cb824385b870d011638c4e39bc30c3d65eb378e5fbf09b8928c34b61172aa` |
| `runs/removal/head-thr-r4-no-egress.test.json` | `c889445b93ad64d0020ef61db8ad837e0d5f3d324fe3b53a5972ae3f50518918` |
| `runs/removal/head-thr-r4-orrery.browser.test.json` | `b10b6334c51be784473f206a267ca2dad1e8cd58ebcfe6a71b12332abfb124bc` |
| `runs/removal/head-thr-r4-polaris-accessible-names.browser.test.json` | `bd5dca6a3038d972fb2e69d533c62b1f855d940330804e5c96a40678f46c330b` |
| `runs/removal/head-thr-r4-polaris-opening-index.browser.test.json` | `fcc415ea6cc1941d523d2eadf98cb4d258bcd4123b8c6aabcdd64efa5baedcb6` |
| `runs/removal/head-thr-r4-polaris-reconciliation.test.json` | `f2f49e91bc4022f2c289d8d7e6b1fb87c472662a06e3b01958d9a7b9de946175` |
| `runs/removal/head-thr-r4-trajectory-narrowing.browser.test.json` | `40402b72ca717671001d7d657a99fa6afb02cd99e44492552090bbd4e2a80c4f` |
| `runs/removal/head-thr-r4-unknown-route-sweep.test.json` | `86a9d2f7b4343bf644806e7ac81af165591f2ed6632b36efdd8f3864c7fb6059` |
| `runs/removal/head-thr-r5-cdp-browser.test.json` | `88a1b5e3e685a249c2dbb2e3c09f8729b9bf6b819a2f3b3a9d69ff699c1928bc` |
| `runs/removal/head-thr-r5-dossier-cap-measure.test.json` | `a4a2acf5141db7534bc996fffa3511df641539ce0a2dd865dd83166ae8303563` |
| `runs/removal/head-thr-r5-durable-lifecycle-generate.test.json` | `19e7bbd881a40ee220605d83d77d6c972b20f7fa975bbc34e8ccbc27a108396a` |
| `runs/removal/head-thr-r5-fixture-directories.test.json` | `e0ff8f41c3b015589dbf7da53281742ea6b0d80783fc7d93ec0f8169cf863fed` |
| `runs/removal/head-thr-r5-governing-intent-sweep.test.json` | `38ae13f95a9aedc083448d556878e584dc19b351a139488f188e5cf6bf8e1250` |
| `runs/removal/head-thr-r5-no-egress.test.json` | `d02df6f6fc78488ba6178b6936595d471cf93a41cfec3aa48e844bdbd740fa86` |
| `runs/removal/head-thr-r5-orrery.browser.test.json` | `58e146e204000486c611567d887888f6e6cfb28c4979fae2f982677f23ccf480` |
| `runs/removal/head-thr-r5-polaris-accessible-names.browser.test.json` | `944fc3871019cea0cb973509595bc14d524a2d3fd0fbeb8bcc3e7ffe845dd5d7` |
| `runs/removal/head-thr-r5-polaris-opening-index.browser.test.json` | `e3aa0deb25128f440a12e71523f7bbc3ed666c8fabf699fc6320d25df3a82265` |
| `runs/removal/head-thr-r5-polaris-reconciliation.test.json` | `abac89acd0d1af5b900b0601e5df611c96bdceaced0d46bbf099f256d13f825d` |
| `runs/removal/head-thr-r5-trajectory-narrowing.browser.test.json` | `63459e55fa93d0892ad213bac0cddfdfbe5ce6e79ced2cfa77edfd7b4e9c545d` |
| `runs/removal/head-thr-r5-unknown-route-sweep.test.json` | `6378f6b069d21b52c8e8569029c081c12b1bd0be0abb7b750ea7296353b74d6a` |
| `runs/removal/head-thr.jsonl` | `44b98919bca958d09e3eee268a0a84d0e034831891cfffef5dedf3c0abb603e6` |
| `runs/sanity/sanity-h1-r1-governing-intent-sweep.test.json` | `70c9e23726a70a4548b78dd63d10a93002a028d5d5853b9c82f6c2f690b6e512` |
| `runs/sanity/sanity-h1-r1-no-egress.test.json` | `34c3218cb9779ba3c5eec7c3be4ac964896a1da69496f47cc01d34ca232316cc` |
| `runs/sanity/sanity-h1.jsonl` | `03067067d5c32e4a8bf93e30cb057bb2414fb7f30e5f5a887b25a5388a63be58` |
| `runs/six-progress.log` | `9eb891920a2b646dedb20851c5761337d1c8bec0c8b6f1d1753ccb8ac27924a5` |
| `runs/six/six-base-r1.json` | `3010e26a6a217fc4449706ec35317a3a81ecf14c9cfe2360ebc5ae75afb60a66` |
| `runs/six/six-base-r2.json` | `4efa066600e3e252faaa9aa20ece68986c379472db3a5f60b96e6b17f118035a` |
| `runs/six/six-base-r3.json` | `adb596be4f87a283cc5339d7188f6afffc8182af90e891bd2e58ddeaaa98bd1c` |
| `runs/six/six-head-r1.json` | `5206b398025e6dc6740b568009c383a13d9f11e0c9371a07e414528fccbf247c` |
| `runs/six/six-head-r2.json` | `a8784549f493975aa3d566de9c1878c4b5a4c221b68801f727e32415eb847f8f` |
| `runs/six/six-head-r3.json` | `93850a455cd15a389abd46db0304e3af995fc7a80a3e34dc7597d7038ac5849a` |
| `runs/six/six.jsonl` | `f04082192b6fd732997f3d53a42472efe799b2345bc206a0bd7b0662fbc67f2f` |
| `sample-keys.txt` | `75ba5852f3b5abf1d5abd5fbdb9c47503d7e27a4a999929313bd4ca64f12c7d6` |
| `six-blame.txt` | `d8d7a54d5feac5ec5235fa82bb5e79e93b37695683f6473706b202231de1bf0c` |
| `six-report.txt` | `4dbd8a310a171e5ed1751a032f4e2e0228ef2cce85b8bc38a3dd32923268f534` |
| `token-diff-mutants.txt` | `d311d4fb99c5b0ba9656a70d5ccd35d2b7aa93810111162f5855e94380751358` |
| `token-diff.txt` | `1f8da843adc18c8f3cd009e26a6df5c4d0cec952535b26609430d98cddf1eeb6` |
| `tools/analyze_removals.py` | `2516fd41bbfd98289738e2b877897934f36326f7c5fe570e68fde5eb1c371f20` |
| `tools/below_default.py` | `02dcfd71a6482f50883aa3e85125c729a330634ae77a731022089577bf1694a1` |
| `tools/cite_lookup.py` | `64573d26a9885490f4d0055172b0227a701561ad1988cee0487f67402633af85` |
| `tools/cite_summary.py` | `bfdfb5de71d35da9bd01fd77d0c0928797267eb3e964b8165babf6ca3dd8dc0a` |
| `tools/compare_census.py` | `502f636c6fb1db1ee1bbf14ea133a14a12330fc5f5bd528e0eed49db1250d015` |
| `tools/find_test.mjs` | `c0acc39d4725a761e0b82f8b6f7b91024f2e6843cae25c837b3ce49485aa78dd` |
| `tools/fixture/forms.test.ts.txt` | `aed96f813be1838f7a25af0424fef62bbfb48c4ee02b429b0695fefd490c2ff4` |
| `tools/fixture/helper.ts.txt` | `3a583d40c96ed3b3d7a768a350cef24b5a06a237edb1043e5cc0ecd5eebf9255` |
| `tools/lane_tool_mutants.py` | `2653c2fd2c310a8f4c2c68629bffe3db7e089d6b05969f3f098b559daa8eb2f8` |
| `tools/reason_check.py` | `678f10a06a4e66f721d56135929c0c8a369cb0dcd3c643ece36ece6d0976497f` |
| `tools/rev_census.mjs` | `321292b60a120e6d44c0445ea3ac6bdc1f39cb8fc29d946edd6e8429fcb230ef` |
| `tools/ruling7_sweep.py` | `c47bd12af06fdc79dc871bd3d254a1d135a636e53d421caa8d547c2121deeda2` |
| `tools/run_ab.py` | `f9452286646503f7b7d8d555e270c2b8cebfacbf66d9e7b90a8cf08d4c11af5c` |
| `tools/run_sample.py` | `36902f1fcd4b8c0b0a44ff37fd544e110d58396dc363df69f59df48d98a031a5` |
| `tools/six_report.py` | `d40da4c3fccce0ca2c3df7696ae907fb9fa072f29f94a302a5f52be43bf73a33` |
| `tools/threshold.vitest.config.mjs` | `ab5fae2a1d0f096f0accd70ebac5e8b2a27d08daa46d14d8bffa46e0e4e4ba09` |
| `tools/token_diff.py` | `8958a3fd3d736f4d9da78256d6c61bc8e04a55c070ee9303d2837805bd344199` |
| `tools/token_diff_mutants.py` | `1cc3245e5cfaf5703da5db74a52b1d1a9e8dde716c77d725f405f84870bcc506` |
| `tools/tokens.mjs` | `0796ff8240dde93e0c7fbceea7f252ba372e1a98242fa5a3aa2371f7539eb108` |
| `tools/tree_reporter.mjs` | `eb409384caef53d548ef06f209306e038125d946146ca855b7b1f2b2e24b32b7` |
| `trial-merge.txt` | `3887951d8a90d24b4202819110be691d4e1086cdcc42d21b46090aebbbd4d0e3` |
| `typecheck.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |

176 files kept, none over 300 KB. The raw review itself is not listed; its sha256 is given in the reply.
