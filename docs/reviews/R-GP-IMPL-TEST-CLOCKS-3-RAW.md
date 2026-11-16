# R-GP-IMPL-TEST-CLOCKS-3 — CC-REV-1 implementation review of syzygy-bpyt.4.5, round 3
Verdict: REVISE
Reviewed commit: d0467aeb
Subject: r3-review.diff sha256 9d87ec600a772d78c947f995f39b2c023ab03a8c9a4f5b92e6b19bf8902e8e57

Reviewer: an independent, fresh-context CC-REV-1 reviewer (rev-532c), 2026-10-27. Brief:
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/lead/b45/brief-r3.md`.
Paths below without a directory are under
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-532c/`.

**In one paragraph.** The compiler-API row kills round 2's S1–S6 and passes L1–L3, and `build_record.py` now derives
and checks the margins from the runs: a consistent 9.97× and a consistent 9.9995× record are both refused. But the
stopping rule's trigger is met. Five daemon-path loads of mine (Y1–Y5) keep every mention of the POC app inside a
then-block, so they pass all 16 daemon-entry rows and the 165 static rows. The daemon then starts with the POC app loaded
(6 modules by the load hook, 6 files by strace, `GET /` 200). The base's old pin fails each one. So the old pin goes
back beside the new rows (F1). `build_record` also passes a mutant row that falls under its bound, because an unreached
row is dropped from the check. That definition came from round 2's own proposed fix (F2). It also copies
`geometricMeanNowMs` from the producer (F3). Both fixes are small and need no re-measurement. There are six notes.

## 1. Subject identity checks

All digests below were computed by `sha256sum` or `git`, never typed in. [Observed]
- **Subject file.** `lead/b45/r3-review.diff` hashes to `9d87ec600a772d78c947f995f39b2c023ab03a8c9a4f5b92e6b19bf8902e8e57`, as
  the brief says. `git diff 34771b03 d0467aeb` gives the same digest, and `cmp` against the file prints nothing.
  `--shortstat`: `17 files changed, 8659 insertions(+), 677 deletions(-)`. **Matches.**
- **Whole PR.** `git diff d38d7a3c d0467aeb` hashes to `34300e0192076563f925acb35a94c654aed0cd19e81abdae5e38584692087225`:
  `40 files changed, 36629 insertions(+), 56 deletions(-)`. **Matches.**
- **`34771b03` is git's own merge.** Its parents are `9e00252a` and `d38d7a3c`. Its tree, `206e891861a694dd8289efb3d891e532ad3a53a7`, equals
  `git merge-tree --write-tree 9e00252a d38d7a3c`. `git diff-tree -r` between the two gives 0 paths over 5,685 tree
  entries. So it equals git's merge path for path.
- **PR state.** `gh pr view 532` gives head `d0467aeb44a1a980572118f20d322be519b72bbe`, state OPEN. `git ls-remote` at the
  end of the review gives `refs/pull/532/head` still at `d0467aeb…`.
- **Hosted checks** at `d0467aeb` (`results/gh-pr-checks.txt`, verbatim):
  `checks	pass	24m9s	https://github.com/Tzeusy/syzygy/actions/runs/40480144816/job/122108112789` and
  `node	pass	4m38s	https://github.com/Tzeusy/syzygy/actions/runs/40480144860/job/122108113043`. The runs API gives
  `node-ci` 40480144860 and `governance-docs` 40480144816, both `success` with `headSha` `d0467aeb…`.
- **The repair's commits** (`git log 34771b03..d0467aeb`): `2b56a253` (test), `7cda7c69`, `27c5aa53` and `d0467aeb`
  (evidence). `2b56a253` is an ancestor of `d0467aeb`, and between them only 11 paths change, all under
  `docs/evidence/syzygy-bpyt-4-5/`.
- **Main has moved.** `refs/heads/main` was at `41932c3b5aba567376fea3b32a80a54f8b6b30ab` for most of the review.
  Near its end, #540 landed as `973965a82f82d9b90af05e4b96524aae0d9dbec4`. That is a merge of `6df4e623`, the head I had
  already checked: 6 commits ahead, 92 files (`results/main-moved-41932c3b-973965a8.json`, from the GitHub compare API).
  Main was still at `973965a8` at my last `git ls-remote`.
  - From `d38d7a3c` to `41932c3b`, main changed 260 paths (`results/main-moved-paths.txt`).
  - **PR paths among them: 1 of 40.** `apps/three-surface-poc/src/main.test.ts`: #539 edits its import at `:9`, and the
    PR's hunk is at `:545-547`. The merged file holds both.
  - **Files a probe fragment binds.** The lane's 31 fragments bind 4 files: `apps/syzygy/src/main.ts` (26),
    `packages/http-host/src/shutdown.ts` (2), the daemon-entry test (2) and `packages/polaris-dossier/src/state-directory.ts`
    (1). My 23 fragments bind `main.ts` only. Of these 4 files, main changed 1: `shutdown.ts`, blob `409e3247` →
    `d83885cd`, 6 lines added, all comments. `main.ts` (`0c03e8bf`), `state-directory.ts` (`26ad83ea`) and the
    daemon-entry test are byte-identical on main.
  - Main also changed `packages/http-host/src/server.ts`, but no fragment binds it.
  - **The CPU regions' module closures** (`results/region-closure-r3.json`; 11, 1, 1 and 1 files): main changed 0 of them.
  - **#540** (`results/pr540-files.json` and the compare above, 92 files): it touches 0 PR paths, 0 files a fragment
    binds and 0 closure files.
- **Local merge.** `455c60eaa77a75345e86d5ed23812e2b626b0992` has parents `d0467aeb` and `41932c3b`. `git merge-tree` is
  clean, and the merge was never pushed. It differs from `41932c3b` in exactly the 40 PR paths
  (`results/merge-vs-main-paths.txt`). `npm ci` and `npm run build` exit 0 (`results/npm-ci-merge.log`,
  `results/build-merge.log`).
- **Second local merge, with current main.** `058fc782803d6c3a1dc395be712346b54e4a84ec` has parents `d0467aeb` and
  `973965a8`. `git merge-tree` is clean, and this merge was never pushed either. It differs from `973965a8` in exactly
  the 40 PR paths (`results/merge2-vs-main-paths.txt`, `cmp` against the PR path list prints nothing). `npm ci` and
  `npm run build` exit 0 (`results/npm-ci-merge2.log`, `results/build-merge2.log`).

## 2. Clauses relied on, and the class ruling

Each clause was quoted at `d0467aeb`. Between `9e00252a` and `d0467aeb`, the governing files changed only in AGENTS.md
(+10/−2), and the rule lines quoted here did not move.

- **CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`):
  - `:18-20`: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the
    agent performing the change never finally decides which classes it touches."
  - `:31-32`: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
  - `:37`: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - `:40-41`: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can
    depend on;"
  - `:49-50`: "**The change record states** which classes the change touches, or "none," so a misclassification is a
    findable violation after the fact."
- **GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
  - `:52-55` (list items joined with semicolons): ""Behavior-preserving" means none of the following changes: a rendered
    byte, a wire format, a refusal string or an exit code; a signed or digest-bound artifact; a consent, security or
    retention decision."
  - `:62-66` (joined; the ellipses are mine): "**Which ones:** pull requests touching class 1 (authority boundaries),
    class 3 (deterministic observation) or class 4 (security) … an old-versus-new differential over a mutated-record
    corpus …; a rule-6 mutant for each predicate; a non-blocking owner notice in the cycle report."
  - `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- **The test-rigor bar** (`.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`, read with `git show d0467aeb:`):
  - `:42`: "**A test is worth keeping only if some plausible bug makes it fail.**"
  - `:52-54`: "1. **Assert behavior, not implementation** — … A pure refactor should not break tests; a behavior change must."
  - `:64-67`: "4. **No tautologies** — … Expected values are literals or independently derived."
  - `:78-81`: "6. **Deterministic or quarantined** — A test that fails intermittently is worse than no test: it trains people to
    ignore red."
  - `:82-83`: "7. **A failure names the defect** — Test names state expected behavior ("rejects_expired_token"); assertion
    messages make the diff readable."
- **AGENTS.md verification rules**:
  - `:122`: "3. Digests are scripted, never transcribed; totals are computed."
  - `:126`: "6. Mutate the input and confirm the check fails, per predicate, before trusting it".
  - `:132`: "9. A claim of absence needs a sweep with a denominator."
  - `:134`: "11. An evidence record names its subject and the subject's digest".
- **The coordinator's ruling on the bound method** (`lead/b45/brief-r1.md:30-31`): "Its bound is the geometric mean of
  head's maximum over at least 10 runs under load and the mutant's minimum, with at least 10× separation on each side".
- **The subject's own claims:**
  - The new row's comment (`packages/cap1-system/src/daemon-entry-unchanged.system.test.ts:242-248`): "A load the row
    above never reaches (on a start failure, in main()'s close-failure callback, at a request-time entry read, or behind a
    variable or a runtime hook the row does not set) shows only in the text, and only in main.ts … each is the one `if`
    in main(), or in an else chain there, on `argv[0] === 'dossier'` or `'polaris'`. An else would run on every other
    argv, so the only one allowed is the other branch. Both end before the daemon path, and every mention of the POC app
    in main.ts lies inside one of their blocks."
  - The load-hook row above it (`:214-218`): "the daemon path never loads the POC app, and the `dossier render` branch
    does".
  - `build_record.py:10-12`: "Every digest and total is computed here from the files and git objects, never typed in".
  - `build_record.py:23-27`: "Checked claims: … every CPU bound in the tests sits 10x or more from the head's slowest
    region and from the mutant's fastest, on thread CPU and under the process-CPU fallback alike. Both figures are
    derived here from the runs, never read from the producer's summary: … a row is reached when its minimum is 10x the
    head maximum or more, and the mutant minimum is the smallest over reached rows."
  - `build_record.py:16-19`: "… emit-equal to EVIDENCE_COMMIT's (tools/emit_equal.mjs: TypeScript's emit with comments
    removed and each `const <NAME>_CPU_MS = <n>;` masked), so they differ only in comments, types or a bound's value,
    none of which changes what the timed regions run."

**Class ruling: classes 1, 4 and 6, as in rounds 1 and 2.** [Inferred]
- The repair changes the class-1 and class-6 daemon-entry text row. That row is evidence that the daemon path stays
  outside the POC app, beside the daemon's CLI byte and exit-code rows.
- It changes the helper comment in the three class-4 bound files: the JUnit scans of operator- or project-supplied
  artifacts, and the excerpt and edge-trim regions.
- The procedural consequence is nil. Class 1 already brings in every GP-Q0 check, and this review is the independent one.

**GP-Q0.**
- [Observed] The repair changes 4 test files and 13 evidence files. The whole PR changes 10 test files and 30 evidence
  files. Neither changes a product file or a path under `.syzygy/` or `openspec/`.
- [Observed] The daemon-entry file passes 16/16 at `d0467aeb` and on the merge. The system suite gives `49 passed`,
  1 pending, of 50 at both (3.6). The record's `rowDelta` is still `Tests: +2 ~17 -1`.
- So no rendered byte, wire format, refusal string or exit code changes, and nothing a product gate accepts or refuses
  changes (`:52-55`).
- What changes is what the test suite refuses:
  - at `d0467aeb` it refuses S1–S7, which round 2's head accepted, and it accepts L1–L3;
  - it accepts Y1–Y5, which the base's old pin refused (F1).
- Those are defects in the reviewed test bytes, not gate decisions for the owner. The stop clause (`:95-96`) is not
  triggered.

## 3. What I ran and the results

Each vitest run used its own short TMPDIR (`/tmp/r532c-1` to `/tmp/r532c-11`) and ran one vitest process at a time.
`load1` is `/proc/loadavg` at the start, or start → end. The node is `v24.6.0`.

### 3.1 The text rows over 35 main.ts variants (the control, 11 of the lane's, 23 of mine) (`tools/text_rows_r3.py`, `tools/r3_variants.py`, `results/text-rows-r3.json`)

Each variant is run against two rows of `daemon-entry-unchanged.system.test.ts`, under the system config, at
`d0467aeb`:
- **new**: the tree's own compiler-API row, `:249`;
- **old**: the base's pin, `d38d7a3c:…:212-227`. The test file is byte-identical at `c104771f` and `d38d7a3c`.

Main.ts is blob `0c03e8bf` (sha256 `07404d93c055c83c9334880c062e98687a4c78a99a104049df0e95076c6555e6`), the same at `d38d7a3c`, `d0467aeb`, `41932c3b` and `973965a8`. load1 ran from 26.5
to 41.3. The first failure line of each failing row is quoted verbatim.

| Variant | Kind | New row | Old pin |
|---|---|---|---|
| control | — | passed | passed |
| S1, S3, S4, S5 | lane defects | failed `expected false to be true // Object.is equality` | failed `expected [ …(3) ] to deeply equal [ …(2) ]` |
| S2, S6 | lane defects | failed `expected [ Array(1) ] to deeply equal []` | failed (same) |
| S7 | lane defect | failed `expected false to be true …` | **passed** |
| L1 | lane equivalent | passed | passed |
| L2, L3 | lane equivalents | passed | failed `expected [ …(2) ] to deeply equal [ …(2) ]` |
| C1 | lane equivalent (disclosed) | failed `expected [ Array(1) ] …` | failed |
| **Y1, Y2, Y3, Y4, Y5** | **my loads** | **passed** | **failed `expected [ …(3) ] to deeply equal [ …(2) ]`** |
| Y1b | my load, adds no mention | passed | passed |
| Z1, Z2, Z5, Z6, Z7 | my loads | failed `expected [ Array(1) ] to deeply equal []` | failed |
| Z3 (comma in the polaris condition) | my load | failed `expected [ 1, +0 ] to deeply equal [ 1, 1 ]` | failed |
| Z4 (second `if` on the same condition) | my load | failed `expected [ 2, 1 ] to deeply equal [ 1, 1 ]` | failed |
| Z8 (concatenated specifier) | my load | passed | passed |
| Z9, Z10 (function or `var` declared in a branch, used later) | my loads | passed | failed |
| G1, G2, G3 | my legitimate shapes | passed | failed (`[ …(2) ]`; `expected -1 to be greater than 7254`; `expected 7481 to be greater than 7760`) |
| G4 | my legitimate shape | passed | passed |
| G5, G6, G7 | my legitimate shapes | failed `expected [ +0, 1 ] to deeply equal [ 1, 1 ]` | failed `expected -1 to be greater than -1` |

[Observed] My S1–S7, L1–L3 and C1 outcomes agree with the record's four retained daemon-entry runs at `d0467aeb`. Of
those 11 ids, 0 disagree (`tools/record_de_check_r3.py`, `results/record-de-check-r3.json`: `disagreeWithRev532c: []`).

The variants, by kind (exact bytes in `tools/r3_variants.py`, and as applied in the `edits` field of the results):
- **Daemon-path loads the brief asked for (16).** Y1–Y5 sit inside a then-block. Z1–Z10 sit elsewhere: a load before the
  `if`, a conditional expression, a comma expression, a second `if`, a `switch`, a shadowed `argv`, a template literal,
  a concatenated specifier, a function declared in a branch and called later, a hoisted `var`. Y1b is Y1 with no new
  mention.
- **Legitimate shapes (7).**
  - G1: an Allman brace, with the import wrapped over three lines.
  - G2: block comments around `else` and inside the condition.
  - G3: the else-if order swapped.
  - G4: trailing comments, and `return await`.
  - G5: double quotes. G6: no spaces around `===`. G7: doubled parentheses.

### 3.2 What the surviving loads do at runtime (`tools/demo_loads_r3.py`, `results/demo-loads-r3.json`)

Each variant is applied, then `npx tsc -b apps/syzygy` runs; each compiles with exit 0 unless stated. Then the built
entry is driven with the variant's argv, against a fixture root:
- once with the PR's own load hook (`NODE_OPTIONS=--import=…`, the same hook text as `:223-230`);
- once under `strace -f -e trace=openat`, without the hook.

Each time I GET `/` once, then SIGINT the entry's own PID. After each variant, the daemon-entry file (system config) and
the 4 static files that read main.ts or walk its import graph are run. load1 ran from 29.2 to 42.9.

| Variant | argv (env) | Hook: exit, listening, GET /, POC URLs | strace: POC dist files | Daemon-entry rows | Static rows |
|---|---|---|---|---|---|
| Y1 | `dossier serve --root R --state-dir S --port 0` | 0, yes, 200, **6** | **6** | 16/16 | 165/165 |
| Y2 | `dossier serve …` | 0, yes, 200, **6** | **6** | 16/16 | 165/165 |
| Y3 | `--root R --state-dir S --port 0` (`SYZYGY_PRELOAD_RENDERER=1`) | 0, yes, 200, **6**; without the variable: 0, yes, 200, 0 | **6** | 16/16 | 165/165 |
| Y4 | `polaris --serve --root R …` | 0, yes, 200, **6** | **6** | 16/16 | 165/165 |
| Y5 | `dossier serve …` | 0, yes, 200, **6** | **6** | 16/16 | 165/165 |
| Y1b | `dossier serve …` | 0, yes, 200, **6** | **6** | 16/16 | 165/165 |
| Z8 | `--help` (`SYZYGY_PRELOAD_RENDERER=1`) | 0, no (help), —, 6 | 6 | 16/16 | **159/165** (6 rows of the static files fail) |
| Z9, Z10 | — | `tsc -b apps/syzygy` exit 1 (TS2304 `Cannot find name 'warm'`; TS2454 used before being assigned) | — | — | — |

[Observed] In every case the first logged URL is `…/apps/three-surface-poc/dist/polaris-generation/dossier-site.js`.
- Z8 is caught by the static suite.
- Z9 and Z10 are caught by the compiler, and so by `npm run typecheck`. Z10 is inert in any case: on the daemon path the
  `var` is unassigned.
- So Y1–Y5 are the loads that the old pin catches and that every other test passes. Y1b passes the old pin too (N1).

### 3.3 Round 2's N1, at the head (`tools/x_probe_r3.py`, `results/x-probe-d0467aeb.json`)

Each row is the whole daemon-entry file, after a rebuild, at load1 40.9–43.1.
- control: 16/16.
- **X1** (main.ts `closeFailed`): 15/16, failing only the new text row.
- **X2** (http-host close-failure): 16/16.
- **X3** (http-host shutdown): 15/16, failing only the load-hook row.

The record's four retained runs agree (`results/record-de-check-r3.json`). X2 passes every row of the new test, the old
pin, the `447d9f08` test and the `9e00252a` test.

### 3.4 `build_record.py`

- **Rebuild at `d0467aeb`.** The command is `python3 -I docs/evidence/syzygy-bpyt-4-5/tools/build_record.py . c104771f
  d38d7a3c 2b56a253 447d9f08 9e00252a`. It exits 0, and `git status --porcelain` is then empty, so the committed record is
  reproduced byte for byte. Its last line begins `{"rowDelta": "Tests: +2 ~17 -1", "testFiles": 10, "productFilesChanged":
  [], "mutantTotals": {"cases": 33, "sides": 65, "asExpected": 65}` (`results/build-record-rebuild-d0467aeb.log`).
- **The lane's 32 rule-6 mutants** (`tools/build_record_mutants.py`, re-run at `d0467aeb`, both tools identical between
  `27c5aa53` and `d0467aeb`): 32 of 32 as expected, `32 32 []`. Round 2's K3, K4, K5 and K7 are among the killed:
  `K3-node22-headMax-9.97x`, `K4-node22-mutantMin-9.67x`, `K5-node22-recorded-margin-9.5x` and
  `K7-thread-headRun-over-max` (`results/lane-build-record-mutants-at-d0467aeb.json`).
- **My 10 mutants** (`tools/build_record_mutants_r3.py`, `results/build-record-mutants-r3.json`). Most are
  *consistent*: every summary the producer writes is edited to agree with the edited runs, so only a check that derives
  from the runs can refuse them.

| Id | Edit | Sound outcome | Outcome, last line |
|---|---|---|---|
| B0 | none | pass | exit 0 |
| B1 | Node 24 ATTRIBUTE_SCAN: the slowest head region at 301 ms (3000/301 = **9.97×**), summaries agreeing | fail | **killed**: `cpu-separation: ATTRIBUTE_SCAN_CPU_MS: not 10x from both sides (10.0, 20.0)` |
| B2 | Node 22 EDGE_TRIM: each mutant run capped at 18,999 ms (**9.9995×** the 1,900 bound), summaries agreeing | fail | **killed**: `cpu-separation-node22: EDGE_TRIM_CPU_MS: not 10x from both sides (21.5, 10.0)` |
| B3 | Node 24 TAG_SCAN: the `plural` row's 3 runs end uncapped at 600 ms (under the 1,500 bound), `min` 600, `reached` false | fail | **survives**: exit 0 |
| B4 | Node 24 ATTRIBUTE_SCAN: `proposedBoundMs` 2900 → 9900 | fail | **survives**: exit 0 |
| B5 | Node 22 HOSTILE_LINE: one uncapped mutant run lowered to 1,300 ms (9.29×), summaries untouched | fail | **killed**: `… excerpt-no-cap-quadratic-pattern records min 17314.492 over 0 capped runs; its runs give 1300.0 over 0` |
| B6 | Node 24 EDGE_TRIM: only the slowest of 10 head runs kept | fail | **survives**: exit 0 |
| B7 | Node 24 HOSTILE_LINE: one head run's exit set to 1 | fail | **killed**: `… no head runs, or a head run failed` |
| B8 | Node 22 ATTRIBUTE_SCAN: head max exactly 300.0 ms (**10.0×**), summaries agreeing | pass | passes (the boundary; correct) |
| B9 | `census-head.json`: a fifth `cpu-bound` row, in a file no separation measured | fail | **survives**: exit 0 |

What the rebuilt record carries for the survivors:
- **B3, TAG_SCAN:** `mutantMinMs 60021.3`, `mutantMinOverBound 40.0`, and rows
  `['scans unterminated plural tags at the ce', 600.0, False]` and `['scans near-miss tag names at the ceiling', 16.378,
  False]`.
- **B4, ATTRIBUTE_SCAN:** `geometricMeanNowMs 9900`.
- **B6, EDGE_TRIM:** `headRuns 1`.
- **B9:** `cpuBoundCensusLines 5`.

[Observed] The committed figures are right. On both paths, all 8 of 8 `proposedBoundMs` equal the square root of
(head max × mutant min), rounded down to 2 significant figures. For example, Node 24 ATTRIBUTE_SCAN gives
sqrt(148.918 × 60001.8) = 2989.2, which rounds to 2900.
- On both paths, each of the 4 sites has 10 head runs.
- On each path, 1 of the 6 mutant rows is unreached: the near-miss row.
- The census's 4 `cpu-bound` lines (`dossier-profile.test.ts:182`, `excerpt.test.ts:273`,
  `test-artifact-verification.test.ts:111` and `:118`) are the 4 sites on both paths.

### 3.5 The emit-equal method (`tools/emit_equal_probe_r3.py`, `results/emit-equal-probe-r3.json`)

Each probe is a scratch commit off `2b56a253`, made with git plumbing (never checked out or pushed). It is compared by
the tree's own `node docs/evidence/syzygy-bpyt-4-5/tools/emit_equal.mjs` against `2b56a253`, over the three timed files.
- **P1**: `const BUDGET = 1500;` → `const BUDGET: number = 1500;` in `excerpt.test.ts`. Emit-equal: true ×3. This is a
  type annotation, so it is runtime-equal: correct.
- **P2**: `// @vitest-environment jsdom` inserted above `excerpt.test.ts`'s first import. Emit-equal: true ×3.
  - At runtime the file no longer runs (`results/emit-equal-P2-runtime.txt`, verbatim): `Serialized Error: { code:
    'ERR_MODULE_NOT_FOUND' }`, `Tests  no tests`, `Errors  1 error`. jsdom is not installed here.
  - **So emit-equal accepts a change in what the file runs (N3).**
- **P3**: `TAG_SCAN_CPU_MS = 1_500` → `150_000`. Emit-equal: true ×3. This is masked by design, and build_record checks
  the bound value separately (`:101`).
- **P4**: a 5e7-iteration loop at the top of `buildExcerpt` in `excerpt.ts`, the module the HOSTILE_LINE region runs.
  Emit-equal: true ×3. The tool compares test files only (N3).
- **The lane's pairs.** `722231fe`~`2b56a253` and `bb5df680`~`2b56a253` are true ×3. `c104771f`~`2b56a253` is false ×3,
  as it should be: the base is the old test.
- **Module closures** (`tools/region_closure_r3.py`, `results/region-closure-r3.json`). This is the static import
  closure of each region's module, following relative imports and `@syzygy/support`.
  - The EDGE_TRIM closure (root `dossier-profile.ts`) has 11 files. **7 of the 11 differ** between each separation's
    tree (`722231fe` on Node 24, `bb5df680` on Node 22) and `2b56a253`. These are main's `sha256` → `@syzygy/support` move.
  - The HOSTILE_LINE, TAG_SCAN and ATTRIBUTE_SCAN closures are 1 file each, and 0 differ.

### 3.6 Suites and gates

| Run | Tree | Result | load1 |
|---|---|---|---|
| Full suite #1 (`npx vitest run`) | `d0467aeb` | exit 1: `5373 passed, 1 failed, 5 pending` of 5379. Failed: `packages/polaris-dossier/src/run-evidence.test.ts` "dossier run evidence record (S12) reports an open run as not closed, and refuses anything but one run directory", `Error: STACK_TRACE_ERROR` | 25.86 → 48.54. My own `build_record` battery (python and node, no vitest) ran beside it |
| that file alone, ×3 | `d0467aeb` | 4/4, 4/4, 4/4 | 46.97–49.08 |
| Full suite #2, quiet | `d0467aeb` | **exit 0: 5374 passed, 0 failed, 5 pending of 5379** | 45.93 → 48.75 |
| System suite (`--config packages/cap1-system/vitest.config.ts`) | `d0467aeb` | exit 0: 49 passed, 1 pending of 50 | 39.89 → 43.91 |
| The PR's 9 root-config test files | merge `455c60ea` | exit 0: 281/281, 9 files | 33.00 → 34.45 |
| The daemon-entry file (system config) | merge | exit 0: 16/16 | 33.37 → 31.90 |
| Full suite | merge | **exit 0: 5435 passed, 0 failed, 5 pending of 5440** | 31.02 → 42.79 |
| System suite | merge | exit 0: 49 passed, 1 pending of 50 | 36.95 → 40.43 |
| The PR's 9 root-config test files | merge `058fc782` (current main) | exit 0: 281/281 | 37.88 → 36.84 |
| System suite, which holds the daemon-entry file | merge `058fc782` | exit 0: 49 passed, 1 pending of 50 | 36.84 → 35.81 |
| Full suite | merge `058fc782` | **exit 0: 5437 passed, 0 failed, 5 pending of 5442** | 34.53 → 48.66 |
| `npm run typecheck` | `d0467aeb` | exit 0 | — |
| `python3 scripts/check_governance.py` | `d0467aeb` | `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, exit 0; 0 lines name the bead | — |
| `python3 scripts/check_quotations.py` | `d0467aeb` | exit 0 | — |

The root vitest config does not include `packages/cap1-system`. Hosted `node` runs it as `npm run test:system`
(`.github/workflows/node-ci.yml:119-120`), which is why I ran it separately.

### 3.7 Probe fragments on the merge (`tools/fragments_on_merge_r3.py`, `results/fragments-on-merge-r3.json`)

[Observed] Each of the 54 fragments (31 lane, 23 mine) occurs exactly once in its file on the merge (`notOnce: 0`).
The bound blobs on the merge are:
- `main.ts` `0c03e8bf`;
- `state-directory.ts` `26ad83ea`;
- `shutdown.ts` `d83885cd`;
- the daemon-entry test `4a495489`.

On the second merge, `058fc782`, the same holds: 54 of 54 fragments apply once, over the same four blobs
(`results/fragments-on-merge2-058fc782.json`).

On both merges, `build_record` with the record's own subject (MAIN `d38d7a3c`) exits 0 and is byte-stable: `git status
--porcelain` is empty afterwards (`results/build-record-on-merge.log`, `results/build-record-on-merge2.log`). With MAIN
`41932c3b` and EVIDENCE the merge, it refuses (`results/build-record-on-merge.log`, verbatim):
`apps/three-surface-poc/src/main.test.ts differs between c104771ff90f47ffd070f2339c36010458679c71 and
41932c3b5aba567376fea3b32a80a54f8b6b30ab`.

## 4. Round-2 findings: resolved?

- **F1 (the text row ended a branch at the first following `  }`): the six named loads are resolved, but the class is
  not.**
  - [Observed] S1–S6 fail the new row and the old pin (3.1), as `build_record` requires.
  - [Observed] Five new loads of the same class, a daemon-path load the old pin catches that every test passes, survive
    the compiler-API row (Y1–Y5, F1 below).
  - The stopping rule applies.
- **F2 (a legitimate else-if chain failed the row): resolved.**
  - [Observed] L1, L2 and L3 pass the new row.
  - [Observed] So do my G1–G4 (3.1). G5–G7 fail it, as they fail the old pin (N4).
- **F3 (`build_record` trusted the producer's Node 22 margin flag): resolved for the margins, but the derivation is not
  complete.**
  - [Observed] The head max, row mins, capped counts, mutant min and lower-bound flag are derived from the runs on both
    paths. A consistent 9.97× (B1) and a consistent 9.9995× (B2) are refused, and exactly 10× (B8) passes.
  - [Observed] Round 2's K3, K4, K5 and K7 are killed.
  - [Observed] An unreached row is never checked against its bound (B3, F2), and `geometricMeanNowMs` is still copied
    (B4, F3).
  - [Observed] The ≥10-run ruling and the census reconciliation are not checked (B6, B9, N2).
- **N1 (the probe fragments that went stale after #529, and X2): resolved.**
  - [Observed] X1 fails the new text row, X3 fails the load-hook row, and X2 passes 16/16 (3.3).
  - [Observed] X2's residual, as the record states it, is true. "passes every row of the new test, the old pin and both
    earlier tests" holds in all four retained runs.
  - [Observed] Its reason is also true: "main's #529 moved the shutdown handler out of main.ts, the one file the text row
    reads". The 31 lane fragments apply once at `d0467aeb` and on the merge (3.7).
- **N2 (the helper's version wording): resolved.**
  - [Observed] `git grep -c -F 'Node 22 releases' d0467aeb -- apps packages` exits 1, with no hits.
  - [Observed] Each of the 3 timed files opens its helper with "this thread's (`process.threadCpuUsage`, Node 23.9 and
    later) or, where `process.threadCpuUsage` is absent (Node before 23.9), the whole process's (`process.cpuUsage`)"
    (`dossier-profile.test.ts:13-14`, `excerpt.test.ts:6-7`, `test-artifact-verification.test.ts:23-24`).
- **N3 (full-suite runs fail under load in files this change does not reach):** not in the repair's scope. N5 adds one
  figure.

**Scope: what the repair changes beyond round 2's asks.** [Observed] Everything stays within the 4 test files and the
evidence directory. Beyond the asks, the repair:
- **replaces the CPU-file check with `tools/emit_equal.mjs`.** The lane disclosed this, and I judge it (N3);
- adds **S7** and a **round-1-test daemon-entry run** (`daemon-entry-round1-test.json`), and requires both outcomes in
  `build_record`;
- adds **`tools/build_record_mutants.py`** and its retained results (`build-record-mutants.json`);
- redefines **`reached`** as "minimum ≥ 10× head max", where `cpu_separation.py` means "≥ the proposed bound". The lane
  disclosed this, and it is round 2's own proposal; it is the root of F2;
- re-runs the **census, the bound-and-pin mutants and the full suite** (attempt 6);
- rewrites the **row comment** (`:242-248`).

There are 0 product files, and 0 paths under `.syzygy/` or `openspec/`.

## 5. New findings

### F1 — blocking. Five daemon-path loads that the old pin catches pass the compiler-API row and every other test, so under the stopping rule the old pin goes back

- **Severity:** blocking. The brief's REVISE rule names "a daemon-path load the old pin catches that the new row passes".
  This is round 1's F1 class, for the third round, and the guard is class 1.
- **Why the row passes them.** The row checks *where* each mention lies: inside a then-block, by offset (`:266-271`).
  It never checks *whether control leaves that then-block* for the daemon path. A then-block that loads the app and then
  falls through, re-enters `main()`, breaks out of a label or schedules a callback satisfies every assertion. The
  comment's own sentence (`:247-248`) is true of all five. What it does not give is the property in the load-hook row's
  title, "the daemon path never loads the POC app", which the comment says this row backs for the loads the hook never
  reaches (`:242-244`).
- **Evidence.** [Observed] (3.1, 3.2)
  - Each load passes the new row and fails the old pin with `expected [ …(3) ] to deeply equal [ …(2) ]`.
  - Each compiles with `tsc -b apps/syzygy` exit 0, passes the daemon-entry file 16/16 and the 4 static files 165/165.
  - The entry, driven as stated, starts the daemon (listening, `GET /` 200) with **6 POC-app modules loaded by the load
    hook and 6 POC dist files opened under strace**.
- **Each load, exactly.** All are in `apps/syzygy/src/main.ts`, blob `0c03e8bf` (at `d38d7a3c`, `d0467aeb`,
  `41932c3b` and `973965a8`). `SITE` stands for `'@syzygy/three-surface-poc-app/dossier-site'`. The literal bytes are in
  `tools/r3_variants.py`, keys `Y1-…` to `Y5-…`.
  - **Y1, `Y1-dossier-serve-falls-through`.** It replaces `:181`, `    return runDossierCli(argv.slice(1), {`, with:
    ```
        if (argv[1] === 'serve') {
          // `syzygy dossier serve …` serves the daemon below, with the renderer loaded for its routes.
          await import('@syzygy/three-surface-poc-app/dossier-site');
          process.argv.splice(2, 2);
        } else return runDossierCli(argv.slice(1), {
    ```
    Run: `dossier serve --root R --state-dir S --port 0`.
  - **Y2, `Y2-dossier-serve-reenters-main`.** It inserts after `:172`, `  if (argv[0] === 'dossier') {`:
    ```
        if (argv[1] === 'serve') {
          // `syzygy dossier serve …`: load the renderer, then serve the daemon with the rest of argv.
          await import('@syzygy/three-surface-poc-app/dossier-site');
          process.argv.splice(2, 2);
          return main();
        }
    ```
    Run: the same argv as Y1.
  - **Y3, `Y3-flag-rewrites-argv-into-dossier`.** It replaces `:171`, `  const argv = process.argv.slice(2);`, with
    `  const argv = process.env.SYZYGY_PRELOAD_RENDERER === '1' ? ['dossier', '--preload'] : process.argv.slice(2);`.
    It also inserts after `:172`:
    ```
        if (argv[1] === '--preload') {
          // SYZYGY_PRELOAD_RENDERER=1 warms the renderer, then serves the daemon as asked.
          await import('@syzygy/three-surface-poc-app/dossier-site');
          delete process.env.SYZYGY_PRELOAD_RENDERER;
          return main();
        }
    ```
    Run: a plain `--root R --state-dir S --port 0` with `SYZYGY_PRELOAD_RENDERER=1`. This is round 1's R1 scenario,
    moved inside a branch. Without the variable it loads 0 modules, which is why the load-hook row, which sets no such
    variable, passes.
  - **Y4, `Y4-polaris-labelled-break`.** It replaces `:191-194` (the polaris body and its close) with:
    ```
        polaris: {
          if (argv[1] === '--serve') {
            // `syzygy polaris --serve …`: the daemon below, with the renderer loaded for its routes.
            await import('@syzygy/three-surface-poc-app/dossier-site');
            process.argv.splice(2, 2);
            break polaris;
          }
          const { runPolarisCli } = await import('@syzygy/polaris-dossier');
          const { renderLocalDossier } = await import('@syzygy/three-surface-poc-app/dossier-site');
          return runPolarisCli(argv.slice(1), { renderer: renderLocalDossier });
        }
      }
    ```
    Run: `polaris --serve --root R --state-dir S --port 0`.
  - **Y5, `Y5-dossier-serve-callback-after-branch`.** This is Y1 with its comment and import line replaced by
    `      // `syzygy dossier serve …` serves the daemon below; the renderer loads once it is up.` and
    `      setImmediate(() => void import('@syzygy/three-surface-poc-app/dossier-site'));`.
    Run: the same argv as Y1.
- **Failure scenario.**
  - Someone adds `syzygy dossier serve`, or a renderer warm-up flag, by extending a branch the way Y1 or Y3 does.
  - At the base the text pin goes red (three mentions). At `d0467aeb` every test stays green.
  - The daemon serves with the POC app loaded. With Y3 this happens on a plain daemon invocation.
- **Proposed fix (the stopping rule's remedy, no round 4 on the row).**
  1. Restore the base's old pin byte for byte, `d38d7a3c:packages/cap1-system/src/daemon-entry-unchanged.system.test.ts:212-227`
     (`it('the daemon path never loads the POC app: each import is dynamic and inside the `dossier` or `polaris`
     branch', …)`). Put it beside the compiler-API row and the load-hook row, and keep both of those: the new row still
     kills S7, which the old pin passes.
  2. Add Y1–Y5 to `tools/daemon_entry_probe.py` as `defect` mutants with the fragments above. Have `build_record.py`
     require each to fail the restored pin, and record that each passes the compiler-API row, as a disclosed limit of
     that row.
  3. **The cost.** [Observed] The restored pin also fails five equivalents that the head's test passes: E-comment-in-branch,
     E-renamed-binding, E-branch-swap, L2-nested-function-in-dossier and L3-nested-try-in-polaris (the record's
     `pinKillsDropped`). It also fails my G1, G2 and G3. L1 and G4 pass it.
     - `build_record`'s rule "every `equivalent` passes the new test except the two the record discloses" must then
       disclose those five as failing the pin row alone, and `pinKillsDropped` must be re-worded.
     - Legitimate refactors of the two branches go red again, as they did at the base. That is the trade-off the owner
       pre-ruled; I state it so it is not smoothed over.
  4. Re-run the four daemon-entry runs and the lane's `build_record_mutants.py`, and rebuild the record.

### F2 — blocking (by the brief's rule). `build_record` drops an unreached mutant row from the check, so a mutant row that runs under its bound builds green

- **Severity:** blocking under the brief's REVISE rule, "a margin check that passes a sub-10× margin". The committed data
  is unaffected (3.4), and the fix needs no re-measurement.
- **Evidence.** [Observed]
  - `build_record.py:112` marks a row `reached` only when `min(values) >= 10 * head_max`.
  - `:113-115` take `mutant_min` over reached rows alone.
  - `:114` refuses only when *no* row is reached.
  - So any row under 10× the head max is excluded from the check, including one under the bound itself.
  - B3 makes Node 24 TAG_SCAN's `plural` row finish its 3 runs uncapped at 600 ms, under the 1,500 bound, so the mutant
    passes that case. It exits 0. The rebuilt record still states TAG_SCAN at `mutantMinOverBound 40.0`, with the row
    `['scans unterminated plural tags at the ce', 600.0, False]` beside it.
  - The docstring's claim (`:23-24`), "every CPU bound in the tests sits 10x or more … from the mutant's fastest", does
    not hold for that bound's line: the fastest mutant run there is 600 ms, 0.4× the bound.
- **Where it comes from.** This definition is round 2's own proposed F3 fix (`rev-532b/R-GP-IMPL-TEST-CLOCKS-2-RAW.md`,
  F3, proposed fix): "Derive `mutantMinMs` as the minimum over reached rows: … a row is reached when its min is at least
  10× the head max". The lane implemented it as written. The error is the reviewer's, inherited.
- **Failure scenario.**
  - A later change to `test-artifact-verification.ts` makes the tag-scan mutant fast on plural tags, or a re-measurement
    reruns that row on a machine where it ends early.
  - The `plural` case no longer kills the mutant. The record rebuilds green and still reports 22.7× and 40.0×.
- **Proposed fix.**
  - In `separated()`, require that the set of unreached rows equals the declared set, by title. On both paths that set is
    the one near-miss row, "scans near-miss tag names at the ceiling" under TAG_SCAN. Refuse otherwise.
  - The committed data already meets this: on each path, 1 of the 6 rows is unreached, and it is that row.
  - Add B3 to `tools/build_record_mutants.py` as a `fail` case.

### F3 — blocking (by the brief's rule). `geometricMeanNowMs` is copied from the producer's summary

- **Severity:** blocking under the brief's REVISE rule, "a recorded figure `build_record` still trusts". Low impact: it
  is a narrative figure, not a margin, and all 8 committed values are right (3.4).
- **Evidence.** [Observed]
  - `build_record.py:135` writes `'geometricMeanNowMs': s['proposedBoundMs']`.
  - B4 sets Node 24 ATTRIBUTE_SCAN's `proposedBoundMs` to 9900. It exits 0, and the record carries `geometricMeanNowMs
    9900`. The runs give the square root of (148.918 × 60001.8), 2,989.2, which rounds down to 2,900.
  - This is against the docstring (`:10-12`): "Every digest and total is computed here from the files and git objects,
    never typed in". It is also against AGENTS.md rule 3.
- **Failure scenario.** A hand-merged or re-produced separation carries a stale `proposedBoundMs`. The record then states
  a "geometric mean now" that the runs do not give. A later refit decision that reads it, against the bounds that are
  "not refitted", starts from a wrong number.
- **Proposed fix.**
  - Compute it in `separated()` as the square root of the derived (head max × mutant min), rounded down to 2 significant
    figures, the same rounding as `cpu_separation.py`. Require it to equal `proposedBoundMs`, or drop the field.
  - Add B4 as a `fail` mutant.

### N1 — note. A shared residual: a then-block that falls through after the branch's own import (Y1b) passes the new test and the old pin

- **Evidence.** [Observed] Y1b replaces `main.ts:181` with:
  ```
      if (argv[1] === 'serve') process.argv.splice(2, 2); // `syzygy dossier serve …`: the daemon below
      else return runDossierCli(argv.slice(1), {
  ```
  - It adds no line naming the app: the dossier branch's own import at `:180` has already loaded it.
  - It passes the new row and the old pin, 16/16 daemon-entry rows and 165/165 static rows.
  - It starts the daemon with 6 POC modules loaded (3.2).
  - The base misses it too: its pin passes, and it had no load-hook row. So this is not a regression, and F1's remedy
    does not close it.
- **Proposed follow-up (a bead, not this PR).** A control-flow predicate on the two then-blocks. Each must end every path
  in a `return` whose expression does not call `main`, and contain no `break` or `continue` to an outer label. `argv`
  must be a `const` initialised to exactly `process.argv.slice(2)`, and main.ts must not write to `process.argv`. Check it
  against Y1–Y5 and Y1b (all must fail) and against L1–L3 and G1–G4 (all must pass). If it holds, the old pin can be
  retired a second time.

### N2 — note. Two method properties of the record are not checked: the ≥10 head runs, and that every timed line in the tests was measured

- **Evidence.** [Observed]
  - **B6** keeps 1 of the Node 24 EDGE_TRIM head runs and exits 0, and the record says `headRuns 1`. The coordinator's
    ruling is "head's maximum over at least 10 runs under load" (`brief-r1.md:30-31`). `build_record.py:102` checks only
    that `headRuns` is non-empty.
  - **B9** adds a fifth `cpu-bound` census row in a file no separation measured and exits 0, and the record carries
    `cpuBoundCensusLines 5`. `cpu_files` and `bounds_at_ev` are read from the separations' own sites (`:72`, `:96-97`),
    so the check at `:126`, "not every bound the tests hold", draws its denominator from the population it is checking
    (rule 9).
  - The record is honest in both cases, because it carries the derived figure. Neither case is a trusted summary: the
    census row and the head runs are primary observations. What is missing is a check between them.
  - The committed data meets both properties (3.4).
- **Proposed fix.** In `separated()`, require `len(headRuns) >= 10`. Derive the set of timed files and lines from
  `census-head.json`'s `cpu-bound` rows, or from a sweep at EVIDENCE for `cpuMsSince(`, and require it to equal each
  separation's sites. Add B6 and B9 as `fail` mutants.

### N3 — note. Emit-equal is sound for type-only edits, but the claim it backs is wider than what it compares

- **Type-only acceptance is sound for the test files' runtime.** [Inferred]
  - The tool compares TypeScript's emit. Vitest's esbuild transform erases types the same way, so emit-equal sources run
    the same code.
  - P1 is accepted correctly.
  - An edit that only looks type-level but changes emit is refused, because the emit differs. An example is `foo!: T` →
    `declare foo: T` under ES2022 class-field semantics.
  - I did not sweep every TS construct, so this is not exhaustive.
- **A runtime change it wrongly accepts: a comment that vitest reads.** [Observed] P2, `// @vitest-environment jsdom`, is
  emit-equal, and the file then does not run (3.5). With an installed environment, the file would run under other globals.
  - Round 2's `//`-line rule accepted the same edit, so this is not a regression.
  - Proposed fix: refuse any timed file whose leading comments differ in a `@vitest-` or `@jest-` pragma, or compare the
    raw docblock.
- **The modules under the timed regions are not compared.** [Observed] P4, a busy loop in `excerpt.ts`, is emit-equal ×3.
  - For EDGE_TRIM, 7 of the 11 files in its region's closure differ between both separation trees and `2b56a253`
    (main's `@syzygy/support` move).
  - [Unknown] Whether that changes EDGE_TRIM's region CPU: not measured. [Inferred] Probably not, since it is a move.
  - The docstring's "none of which changes what the timed regions run" (`:18-19`) therefore covers the test files only.
    The same sentence stood in round 2 (`9e00252a:…/build_record.py:17-18`).
  - Proposed fix: extend the check to each region module's static import closure (byte-equal, or emit-equal), or re-run
    EDGE_TRIM's two separations at a tree that holds EVIDENCE's closure, or narrow the docstring to "the three timed test
    files".

### N4 — note. The compiler-API row matches each condition as text, and its failure messages do not name the defect

- **Evidence.** [Observed]
  - `:257` compares `statement.expression.getText(source) === `argv[0] === '${name}'``.
  - G5 (`"dossier"`), G6 (`argv[0]==='dossier'`) and G7 (`((argv[0] === 'dossier'))`) are legitimate, and nothing on
    the daemon path loads in them. Each fails with `expected [ +0, 1 ] to deeply equal [ 1, 1 ]`.
  - The old pin fails all three as well (`expected -1 to be greater than -1`), and no formatter config is tracked at the
    repository root that would prevent those spellings.
  - I rule this a note, not the brief's "a legitimate branch shape the new row fails". The base refused the same three
    shapes, so the suite refuses nothing new, and F1's remedy restores a pin that refuses them anyway.
  - Separately, the row's failures read `expected false to be true // Object.is equality` (S1, S3–S5, S7) and
    `expected [ 1, +0 ] to deeply equal [ 1, 1 ]` (Z3). Neither names which branch or which property failed (bar 7,
    `:82-83`).
- **Proposed fix.**
  - Match the condition structurally: skip parentheses, then require a `BinaryExpression` with `===`, an
    `ElementAccessExpression` `argv[0]` on the left and a `StringLiteral` whose `.text` is the name on the right.
  - Give each `expect` a message naming the branch and the property ("dossier branch has an else other than the polaris
    branch").

### N5 — note. One full-suite run at the head failed once, in a file neither this PR nor main touched, under load

- **Evidence.** [Observed] (3.6)
  - Full suite #1 at `d0467aeb` failed 1 of 5379: `packages/polaris-dossier/src/run-evidence.test.ts`, "dossier run
    evidence record (S12) reports an open run as not closed, and refuses anything but one run directory", `Error:
    STACK_TRACE_ERROR`. load1 was 25.86 → 48.54, and part of that load was my own `build_record` battery, which ran no
    vitest.
  - `git log d38d7a3c..41932c3b` and `git diff d38d7a3c d0467aeb` over that file and `run-evidence.ts` are both empty,
    and #540's 92 files include neither.
  - The file alone passed 4/4 three times at load1 46.97–49.08. The quiet second full run was green, and so are the merge
    run and hosted `node`.
  - [Inferred] A load-induced flake of round 2's N3 class, not attributable to this PR.
  - [Unknown] Its cause: vitest's `STACK_TRACE_ERROR` names no assertion.
- **Proposed follow-up.** A bead to make that row deterministic or quarantine it (bar 6, `:78-81`). The bead should carry
  this run's failure line and load figures.

### N6 — note. The record cannot be rebuilt against current main without re-running its base side for `main.test.ts`

- **Evidence.** [Observed] (3.7)
  - #539 changed `apps/three-surface-poc/src/main.test.ts`, a PR file, on main.
  - `build_record` with MAIN `41932c3b` refuses: `apps/three-surface-poc/src/main.test.ts differs between c104771f… and
    41932c3b…`.
  - The record's daemon-entry runs bind `packages/http-host/src/shutdown.ts`, which #539 changed (+6 comment lines).
    `build_record.py:69-71` refuses any EVIDENCE commit whose `shutdown.ts` differs from the runs' commit.
  - The record stays valid for its stated subject (`MAIN` `d38d7a3c`, `EVIDENCE` `2b56a253`), and it rebuilds byte-stable
    there.
  - [Inferred] The same refusal holds at `973965a8`: #540 touches no PR path, so `main.test.ts` is unchanged from
    `41932c3b`. I did not run it.
- **Consequence.** F1's repair needs new daemon-entry runs anyway. If they are made on a tree that has merged
  current main (`973965a8`), the base-side census and mutant results for `main.test.ts` must be re-run against main's bytes. Otherwise
  the record must keep naming `d38d7a3c` as MAIN and say that main moved. See section 8.

## 6. Changed outputs

[Observed] There are none outside tests and evidence.
- The repair delta's 17 paths are 4 `*.test.ts` files and 13 files under `docs/evidence/syzygy-bpyt-4-5/`.
- The whole PR's 40 paths are 10 test files and 30 evidence files.
- `productFilesChanged` in the rebuilt record is `[]`.
- The 16 daemon-entry rows, including the entry's usage-byte, refusal and exit-code rows, pass at `d0467aeb` and on the
  merge. So does the system suite (49 passed and 1 pending, of 50).
- No rendered byte, wire format, refusal string, exit code or digest-bound artifact changes.
- The three timed test files change only in their helper comment (6 lines each). They are emit-equal to the separations'
  trees.

## 7. Test quality

- **The compiler-API row.** It is a real improvement over round 2's line-text row. It kills S1–S7, which the old pin
  misses for S7. It accepts L1–L3 and G1–G4, so a pure refactor stays green (bar 1). Its shape is now set by syntax, not
  by indentation.
  - But it pins a *syntactic* property, mentions inside then-blocks. The comment presents that as backing a *behavioural*
    one, no daemon-path load. Y1–Y5 are plausible bugs that make it fail to fail (bar `:42`).
  - Its messages do not name the defect (N4, bar 7).
- **The load-hook row** (from round 1) stays the strongest check. It is behaviour-based and catches X3. Its blind spots
  are the argv it never drives: `dossier serve`, `polaris --serve` and environment flags (Y1–Y5). The restored text pin is
  the backstop for those.
- **`build_record`'s rule-6 coverage.**
  - The lane's 32 mutants and my B1, B2, B5, B7 and B8 show that the derivation and the 10× check are real, including
    at the boundary: 9.97× and 9.9995× are refused, and exactly 10× passes.
  - Four predicates have no mutant because the check does not exist: B3, B4, B6 and B9 (F2, F3, N2).
- **The expected values** in the new row are literals, `[1, 1]` and `[]`. In `build_record` they are derived from the
  runs, never imported from the producer (bar 4), except `geometricMeanNowMs` (F3).
- **Determinism.** The rebuilt record's summary line gives `"ac1": 0`, from the head census at `2b56a253`; I did not
  re-run the census this round. The CPU bounds keep at least 20.0× on thread CPU and 15.7× under the Node 22 fallback
  (the record, re-derived by `build_record` from the runs). N5 is outside the PR.

## 8. What the coordinator must re-run or re-check at landing on current main

1. **After the F1–F3 repair:**
   - re-run `tools/daemon_entry_probe.py` for all four daemon-entry runs, with Y1–Y5 added;
   - re-run `tools/build_record_mutants.py` with B3 and B4 added (B6 and B9 too, if N2 is taken);
   - rebuild the record and require `git status` to be clean after a second rebuild.
   - The CPU separations need no re-measurement for F2 or F3.
2. **Choose the record's MAIN** (N6):
   - Either keep `d38d7a3c`, and add a line saying main moved to `973965a8` and which PR paths it touched
     (`apps/three-surface-poc/src/main.test.ts`);
   - or merge current main, then re-run the base-side census and mutants against main's `main.test.ts`, and the four
     daemon-entry runs against main's `shutdown.ts` (`d83885cd`).
3. **Before merging:**
   - fetch main again;
   - if #540 or anything else has landed, re-list main's changes against the 40 PR paths, the 4 files the fragments bind
     (`main.ts`, `shutdown.ts`, `state-directory.ts`, the daemon-entry test) and the 13 distinct closure files in
     `results/region-closure-r3.json` (TAG_SCAN and ATTRIBUTE_SCAN share one root).
   - #540 landed as `973965a8` during this review and touches none of them (1). I re-ran the PR files, the system
     suite and the full suite on a merge with it (3.6). Anything that lands after `973965a8` has not been checked.
4. **On the final merged tree:**
   - run the full root suite and `npm run test:system` once each, one at a time, and record load1;
   - confirm hosted `checks` and `node` on the final head with `gh pr checks`, then merge with `--match-head-commit`.
5. **The restored old pin** reads `main.ts` by exact line. Re-run it on the merged tree even when git reports a clean
   merge: `main.ts` is unchanged on main today, but a later main change to either branch breaks it.

## 9. Cleanup

- **Deleted.** [Observed]
  - The scratch clones `clone/` (269 MB, at `d0467aeb`), `clone2/` (211 MB, merge `455c60ea`) and `clone3/` (merge
    `058fc782`). Both local merges, and the scratch commits that `tools/emit_equal_probe_r3.py` made with git plumbing,
    lived only in those clones.
  - My TMPDIRs `/tmp/r532c-1` to `/tmp/r532c-11`. Afterwards `ls /tmp | grep -c r532c` gives `0`.
  - No process of mine survives: `pgrep -f` on the clone paths matched only its own shell.
- **Never done.** Nothing was pushed. No PR was commented on or merged. No worktree under
  `/home/tze/GitHub/syzygy/.worktrees/` was edited. No observed-repository body and no credential file was read.
- **Kept.** 10 tools under `tools/` and 57 result files under `results/`, 67 files in all. 0 of them is over 300 KB
  (`find tools results -type f -size +300k` gives 0). Each is listed with its sha256 below. This raw is not in the table.

| Path (relative to `rev-532c/`) | sha256 |
|---|---|
| `results/build-merge.log` | `db66ae4860f0b61a6b293087b6c27db7901fdbf883e1a636b494a28995a062ef` |
| `results/build-merge2.log` | `597b358eb98f417637ea8ee02d8d875627f8aea14c146672ac6e228f81cae5a6` |
| `results/build-record-mutants-r3.json` | `b87a5e472274d777366b1cec7ee2f25354c585f2f2eabeda917e108d0e72f212` |
| `results/build-record-mutants-r3.log` | `024c083614c447188ded3f2675558ea28ddab9f21f2c09cb4caeec76bb91c710` |
| `results/build-record-on-merge.log` | `4a3585bcc2274a141c5941188ffc85e1523e868b4b6478dd29677f88b0c85390` |
| `results/build-record-on-merge2.log` | `ce6a8dbefca7dd775ed593460b8a5022d1c9c22eb0aa85308a14c194861c00d8` |
| `results/build-record-rebuild-d0467aeb.log` | `942fc63f010aabef633e418d81a8ddbaf4e913fecaebee50c645889ecb185fa0` |
| `results/check-governance-d0467aeb.log` | `6ab674a2622d3c8c4203347d9d8f8d929ea130d46b3864a503075d6bde6e81cb` |
| `results/check-quotations-d0467aeb.log` | `39e50cee82aa6c5cc47be0a87f95216fb50ea30bebe4af06245e855c6fef430e` |
| `results/demo-loads-r3.json` | `77d38db874fc4dfa7dc77ce657800ffb9c4dd54b0879bcc22f7a6be2a2a44933` |
| `results/demo-loads-r3.log` | `aaf5f1e6803097e399e71344ae887afb7fa5a749e8cecf8d5caa14d1e2a9b861` |
| `results/emit-equal-P2-runtime.json` | `bab2ee4fdbe4093dcd1f0217afd88b371f83fb55097fcbff2ebad91b9eab10d5` |
| `results/emit-equal-P2-runtime.txt` | `dc2df367240616cf5725e17e6726f12973a785d77dec2c64486380bdeb59f674` |
| `results/emit-equal-probe-r3.json` | `7a32320c393cc69f4007a060af9a041b1dac77de45aa938ccd99cd8321f838ee` |
| `results/emit-equal-probe-r3.log` | `d85b4a0c600933e733aaf570fa14387ff201c2b325d42cbac0910a770f79d9d5` |
| `results/fragments-on-merge-r3.json` | `bfc001f6ffd5051682706ae9809423cad1dc8089912e1072bac5ba1fc045726c` |
| `results/fragments-on-merge2-058fc782.json` | `3ddc644b7d037a1ba817460dae7ca3582f558e689892552558629853e3b9d160` |
| `results/full-suite-d0467aeb-2.json` | `4be38458829644b9b87244952834604a787a2e1b670e4ed34ae9d8120ca66b5a` |
| `results/full-suite-d0467aeb-2.log` | `0a44b30789972852740539579c0475668ee4b9d4b178a1cd75259af98f9fa204` |
| `results/full-suite-d0467aeb.json` | `509205c2b9ca0d6ea569f16d6a6398b3692fdb460b0af82a96df27d6be0f266e` |
| `results/full-suite-d0467aeb.log` | `6a70416fc35c47760bc5d639b118d7c10c447aff4e27319c850a6c573569044c` |
| `results/full-suite-merge-455c60ea.json` | `c33320a9b42b23fb1a67d5007b499f17066f7b297bab7156cb90f943dac63010` |
| `results/full-suite-merge-455c60ea.log` | `e643519f152da3bf34a7203254e9f170f1ea63afbb701d3ab20ec5e09c5e200e` |
| `results/full-suite-merge2-058fc782.json` | `0a52980add84fc7204caf0978e15bf84595420a3f00f7bb6def350dff77f8696` |
| `results/full-suite-merge2-058fc782.log` | `c4fca2f9299d220f362faccbbffc49d4e8d06b31aa0d543d96122cba55deed8f` |
| `results/gh-pr-checks.txt` | `3e92a40525fc4eb4d34d1fc0949ecbe151f18e96bce7eb28751d09db5a667a9a` |
| `results/lane-build-record-mutants-at-d0467aeb.json` | `1138e7938ecfe40ed7a95c074516367a3e1d090fe756dd2d9b8e75ef37f864b5` |
| `results/lane-build-record-mutants-at-d0467aeb.log` | `a311789880ffd585577da919e9edb0bff21958fde4b0bad1bedb5fd69129367b` |
| `results/main-moved-41932c3b-973965a8.json` | `6bfdd77211e13cc9526c9fa29054ed37c8e19431c95d14edaa6f284e35618d7f` |
| `results/main-moved-paths.txt` | `8282b6d326ac315a87e4941fda938c5316e54615afbdb9abce7a5991645e8c09` |
| `results/merge-vs-main-paths.txt` | `68b73c1edb6dfd20de4fb9dda337dcc4fc48fd7afc3ec79353368f421c3fb3ca` |
| `results/merge2-vs-main-paths.txt` | `68b73c1edb6dfd20de4fb9dda337dcc4fc48fd7afc3ec79353368f421c3fb3ca` |
| `results/npm-ci-head.log` | `15d485735c80d35daace4176c5afd96f701d995ad35f200df351daf9f03bb7b2` |
| `results/npm-ci-merge.log` | `7903f20d9cdeaa4646d6460b0efb8c0853e99847acefc59c9de6690442013ae7` |
| `results/npm-ci-merge2.log` | `8948f6f3246243344b904ec08788e37e94fa7dfc6eb823af96968c041b60ac4b` |
| `results/pr-body.md` | `e6ecd997a2d0b9db42e1b1eec53bfca329c0e089b2dec4f78fbb446ea446eabf` |
| `results/pr-files-merge2-058fc782.json` | `3bb38bbeb8f0945ca2bc2e9da06d7c510e377f6dca6e66653a5ec2bfe602ddc3` |
| `results/pr-files-merge2-058fc782.log` | `2abd25fe7a4734c270d7c70f4b66a1722fefeb42b0c5e909bbc817abc82bba45` |
| `results/pr-paths.txt` | `68b73c1edb6dfd20de4fb9dda337dcc4fc48fd7afc3ec79353368f421c3fb3ca` |
| `results/pr540-files.json` | `135a222f238e1b8527155e65e6b767a110879232e77fa092e4257ae4df19ac7e` |
| `results/record-de-check-r3.json` | `fdcee0d0a81a04961ee22a173570ee8e3cd69494dd78790645cf853c9d452dff` |
| `results/region-closure-r3.json` | `c4ea6499e521d849bc8d77bd5b0993d139241d33c3d9a7e1d94dd38f8c794417` |
| `results/run-evidence-isolated-1.json` | `7b31aa5c26fea417c795e9f57a88f1d9b847331f273ea31663b6a3b8433ed4a9` |
| `results/run-evidence-isolated-2.json` | `6f3a2e4114d50a2604f7475dbcbda1520b8edf9cc0bb9c07017fb6e1e5a4c94a` |
| `results/run-evidence-isolated-3.json` | `baaacaf3a7038c8f6d5f495d849e70c51bef3c8a6953258ee6272ba77f08a6a3` |
| `results/run-evidence-isolated.log` | `ed80e0d2ac073916f758198ba0ae493e4cd07b25758a25fe3534d3e11650557b` |
| `results/system-suite-d0467aeb.json` | `dd800794d7e33f707bfe91ab9b5b31bb26e6119ffdaf54337db71535893215b5` |
| `results/system-suite-d0467aeb.log` | `c84290d36580243de1a6208b3ab880cfa8b764d1a651c0c7920af89b71ee9423` |
| `results/system-suite-merge-455c60ea.json` | `e5eb474813417fd9adcc21c2c600d11fdf79a310230c0279fbff9786c474ce69` |
| `results/system-suite-merge-455c60ea.log` | `4c06e2c43c1604e1e6a66f10695a70aca493cb0cf6f180e1fb41fcc5831f0e0c` |
| `results/system-suite-merge2-058fc782.json` | `c34027815433bfb39d8cba1f34439e82a6d475357b2d5163446173314af68685` |
| `results/system-suite-merge2-058fc782.log` | `d8a72b28f48abc3bf6cfc0f369703d5c9c668d073980fe88a30862b698532f86` |
| `results/text-rows-r3.json` | `7675fe049ab2324bdd7017618bee375334f3cd0118fe588fd689f43dc6b6f46b` |
| `results/text-rows-r3.log` | `99476a5ef71b87d558429d4d67026a3c4005fc4407bba75365f041477c38e8dd` |
| `results/typecheck-d0467aeb.log` | `2be08a74ceb66bb26e3080c2f813a08fb52decc1999f73636a1a627f7459ffe2` |
| `results/x-probe-d0467aeb.json` | `8758fe63d46c2c2e82bd647bc4b4eba5d9b8fb6695c07aa96194957c16a42d49` |
| `results/x-probe-d0467aeb.log` | `3943ae31f6da1fe9eef67f51e591d92815728eaaa713c6584400e9cdbf63e9f0` |
| `tools/build_record_mutants_r3.py` | `491bfc2bd0b778e4e36b963ffd5c77bd0fea5663727fff9bfa53cf3337cb841f` |
| `tools/demo_loads_r3.py` | `a76710715f823f0f0724dbd21ba22df0ebd2e81ff44decccd4d8b72f9aa30e9b` |
| `tools/emit_equal_probe_r3.py` | `933a71e3067646fc10ab890f399490661ea3ea93e2b8e45f1d6dbecf69f90cb2` |
| `tools/fragments_on_merge_r3.py` | `106d787180a3866048c8c88a3ac271b4f52bdb11a7cfe262dce5a15f9be8447a` |
| `tools/r3_variants.py` | `9e4e0fd3be2221b3d7a1c6098029d6e940425a8581dcd95cf509bd13a03cb536` |
| `tools/record_de_check_r3.py` | `3ba1163f5dc6f237f2222552348de0d7bfae35e01687c8f50cd9665f4044c0a8` |
| `tools/region_closure_r3.py` | `50786b86107d7b8aed80e18de698ab509bd997348f09934e2baf794ba6c68dc0` |
| `tools/suite_r3.py` | `8218bb0dace5776daf0648db13cc7b5c9c123b5d57cc0c6f938e6139cb11564e` |
| `tools/text_rows_r3.py` | `90a89601e2d0df7904bac3f130eaa8cca0a14082c7380cba938a9f6dc96d30f7` |
| `tools/x_probe_r3.py` | `57c078e54632fbc5c2be73833a6901d31e2a94afb0933bf92500629fb47976ce` |
