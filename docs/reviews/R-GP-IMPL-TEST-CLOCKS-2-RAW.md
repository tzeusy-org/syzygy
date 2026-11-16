# R-GP-IMPL-TEST-CLOCKS-2 — CC-REV-1 implementation review of syzygy-bpyt.4.5, round 2
Verdict: REVISE
Reviewed commit: 9e00252a
Subject: r2-review.diff sha256 260e725a177bfa004e9a71a02c203eded404c23c42a3997ce98aed0d176a3ddf

Reviewer: rev-532b, fresh context. No target repository content was fetched; every run used Syzygy's own fixtures in
scratch clones of the Syzygy repository. "Lane" means the implementer of PR #532. Reviewer tools and result files are
listed with their digests in section 8.

Three blocking findings and three notes.
- **F1.** The narrowed text row finds each branch's end as the first following line equal to `  }`. A branch with an
  `else`, or one closed on a line that also holds code, keeps the window open over daemon-path code. Six daemon-path
  loads that the old pin failed pass every test at 9e00252a. One of them (S4) loads the POC app on every non-dossier
  invocation, unseen by the load-hook row.
- **F2.** A legitimate shape, the two branches chained as `if … else if (argv[0] === 'polaris')`, fails the new row. The
  old pin passed it. The defect has been present since 447d9f08; round 1 did not test this shape.
- **F3.** `build_record.py`'s margin check under the Node 22 fallback reads only the producer's `separated` flag. A
  recorded 9.5× margin, and figures giving 9.97× and 9.67×, all rebuild green. Neither check path derives the head
  maximum from the runs.

The committed record's figures are themselves correct: I re-derived every one of them from the runs (section 3.5). Round
1's F1 survivors (R1–R3) are now killed, and N1–N4 are resolved as asked (section 4).

## 1. Subject identity checks

- [Observed] Subject file `sha256sum lead/b45/r2-review.diff` gave
  `260e725a177bfa004e9a71a02c203eded404c23c42a3997ce98aed0d176a3ddf`.
  - In a fresh clone, `git diff 447d9f08 9e00252a | sha256sum` gave the same digest, and `cmp` against the subject file
    printed `IDENTICAL`.
  - `--stat` ends `18 files changed, 5377 insertions(+), 1012 deletions(-)`. **Matches.**
- [Observed] The whole PR, `git diff 8ff50172 9e00252a | sha256sum`, gave
  `fef5c8f2023a57ac4b03b450fb1a00a09e66148c79f5aeaabef125c4a89c10ed`. `--stat` ends
  `35 files changed, 28647 insertions(+), 56 deletions(-)`. **Matches.**
- [Observed] The test-file diff, re-derived by script over the 10 non-evidence paths of `git diff --name-only 8ff50172
  9e00252a`, is `88c6d284cb83a3dfe02e0538aebeb97c60810687e2f6b052b8ff4d663df9b416`.
  - Over `8ff50172..bb5df680` the digest is the same.
  - **It matches the record's `testDiffSha256`.**
- [Observed] Round 1's raw hashes to `7b6cd277191ea6b29a6e835a0219609f72eccc903eea728f0b9e388b2587aff6`, as the brief says.
- [Observed] Refs:
  - GitHub's `agent/syzygy-bpyt.4.5` is `9e00252ae134accc4a42604445a4db66f68d5100`, as is the PR's `headRefOid`.
  - GitHub's `main` is `d38d7a3ce632a34c2a41bdb77ad323ba0b05b777`. The local checkout's `main`, `546f1ff0`, is stale, so
    I fetched from GitHub.
  - `git log --merges 447d9f08..9e00252a` lists 0 commits. The three repair commits are `722231fe`, `bb5df680` and
    `9e00252a`. `bb5df680..9e00252a` touches only evidence files: 0 paths outside `docs/evidence/syzygy-bpyt-4-5/`.
- [Observed] **Main moved.**
  - `git diff --name-only 8ff50172 d38d7a3c` lists 770 paths (`results/main-moved-paths.txt`). `comm -12` against the 35
    subject paths gives 0. `8ff50172` is an ancestor of `d38d7a3c`.
  - Main's change does touch `apps/syzygy/src/main.ts`, the file the kept text row reads. #529 imports
    `closeOnSignal, createDaemon` from `@syzygy/http-host` and replaces the inline shutdown handler with `closeOnSignal`.
    Note N1 covers the consequence.
- [Observed] **The local merge.**
  - `git merge-tree --write-tree 9e00252a d38d7a3c` is clean, with tree `206e8918`. The local merge `9b1b8c83` (parents
    `9e00252a`, `d38d7a3c`; never pushed) has that tree.
  - All 35 subject paths are byte-identical to 9e00252a there (`git diff --quiet 9e00252a HEAD -- <35>` exit 0).
- [Observed] **PR #537** (`agent/syzygy-bpyt.4.31`, head `db8686fe`) and `self-corpus.test.ts`.
  - #537's only hunk there is `@@ -46 +46 @@`, the `}, 30_000);` line gaining a timeout reason.
  - #532's only hunk is `@@ -10,0 +11,3 @@`, three comment lines above `PINNED_MAIN`.
  - **The hunks do not overlap.** `git merge-tree --write-tree 9e00252a db8686fe` is clean (tree `035e9981`), and that
    tree's file holds both: `// Kept as an exact pin` at line 11 and #537's reason at line 49.
- [Observed] **Hosted checks.** `gh pr checks 532` gave `checks pass 20m0s` and `node pass 4m17s`. `gh run list --commit
  9e00252a…` gave `node-ci … success 40456567530` and `governance-docs … success 40456567544`.
- [Observed] **The record rebuilds.** `python3 -I docs/evidence/syzygy-bpyt-4-5/tools/build_record.py . c104771f 8ff50172
  bb5df680 447d9f08` at 9e00252a exited 0 and left the tree clean, so the committed `bounds-and-pins.json` is
  byte-identical to a rebuild. It printed `"mutantTotals": {"cases": 33, "sides": 65, "asExpected": 65}`.
- [Observed] **My own record check**, `tools/record_check_r2.py`, reads git objects only. It printed `TOTAL FAIL 0`
  (section 3.5).

## 2. Clauses relied on, and the class ruling

Quoted at 9e00252a:

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
  - `:52-55` (list items joined with semicolons): ""Behavior-preserving" means none of the following changes: a
    rendered byte, a wire format, a refusal string or an exit code; a signed or digest-bound artifact; a consent,
    security or retention decision."
  - `:62-66` (list items joined; the ellipses are mine): "**Which ones:** pull requests touching class 1 (authority
    boundaries), class 3 (deterministic observation) or class 4 (security) … an old-versus-new differential over a
    mutated-record corpus …; a rule-6 mutant for each predicate; a non-blocking owner notice in the cycle report."
  - `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- **The test-rigor bar** (`git show 9e00252a:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
  - `:42`: "**A test is worth keeping only if some plausible bug makes it fail.**"
  - `:52-54`: "1. **Assert behavior, not implementation** — … A pure refactor should not break tests; a behavior change must."
  - `:64-67`: "4. **No tautologies** — … Expected values are literals or independently derived."
  - `:78-81`: "6. **Deterministic or quarantined** — A test that fails intermittently is worse than no test: it trains people to
    ignore red."
  - `:82-83`: "7. **A failure names the defect** — Test names state expected behavior".
- **AGENTS.md verification rules** at 9e00252a:
  - `:122`: "3. Digests are scripted, never transcribed; totals are computed."
  - `:126`: "6. Mutate the input and confirm the check fails, per predicate, before trusting it".
  - `:132`: "9. A claim of absence needs a sweep with a denominator."
  - `:134`: "11. An evidence record names its subject and the subject's digest".
- **The subject's own claims:**
  - The kept row's comment (`daemon-entry-unchanged.system.test.ts:241-244`): "So every line naming the POC app must sit
    strictly inside the `dossier` or the `polaris` branch: after the line opening it and before the first following line
    that closes it, `  }`. Code between or after the two branches runs on the daemon path."
  - `build_record.py:22-23`: "Checked claims: … every CPU bound in the tests sits 10x or more from the head's slowest
    region and from the mutant's fastest, on thread CPU and under the process-CPU fallback alike."

**Class ruling: classes 1, 4 and 6, as in round 1.**
- [Inferred] The repair changes the class-1 and class-6 daemon-entry row: the evidence that the daemon path stays outside
  the POC app, beside the daemon's CLI byte and exit-code rows.
- [Inferred] The repair changes the helper behind the class-4 bound rows (the JUnit scans of operator- or project-supplied
  artifacts).
- The procedural consequence is nil. Class 1 already brings in every GP-Q0 check, and this review is the independent one.

**GP-Q0.**
- [Observed] The repair changes 6 test files and 12 evidence files. It changes 0 product files, and 0 paths under
  `.syzygy/` or `openspec/`.
- [Observed] The rows that pin the entry's usage bytes, refusal strings and exit codes pass 16/16 at 9e00252a and on the
  merge. The system suite gives `49 passed | 1 skipped (50)` at both.
- So no rendered byte, wire format, refusal string or exit code changes, and nothing a product gate accepts or refuses
  changes (`:52-55`).
- What changes is what the test suite refuses:
  - at 9e00252a it refuses R1–R3, which it accepted at 447d9f08;
  - it still accepts S1–S6, which the old pin refused (F1);
  - it refuses L1, which the old pin accepted (F2).
- Those are defects to fix in the reviewed bytes, not gate decisions for the owner. The stop clause (`:95-96`) is not
  triggered.

## 3. What I ran and the results

All runs used scratch clones, after `npm ci`, each with a private TMPDIR. The host is 12 CPUs, and its load1 ran from
about 30 to 89 across my runs; each run's load is in its result file. Unless stated otherwise the runs were on Node
v24.6.0; the Node 22 runs used v22.18.0.

### 3.1 Daemon entry: round 1's R1–R3 and my own loads (`tools/de_r2_mutants.py`, `results/de-r2-mutants.json`)

**Method.**
- Each mutant edits `apps/syzygy/src/main.ts` at 9e00252a; its `old` must occur exactly once.
- The tool rebuilds with `npx tsc -b apps/syzygy` and runs three copies of the daemon-entry file under the system config:
  - **new**: the tree's file;
  - **old**: `8ff50172`'s copy, the text pin;
  - **prior**: `447d9f08`'s copy.
- For each defect it also runs the four static files that read main.ts or walk its import graph (`subpath-imports`,
  `island-boundary`, `argv`, `workspace-reach`: 133 rows).
- R1–R3 are copied verbatim from round 1's tool, and the E- equivalents from the lane's probe.

`FLAG` below is `process.env.SYZYGY_PRELOAD_RENDERER === '1'`.

| Mutant | Kind | What it does | New (16 rows) | Old pin | 447d9f08 test | Static (133) |
|---|---|---|---|---|---|---|
| control | — | none | 16/16 pass | 15/15 pass | 16/16 pass | 133/133 pass |
| R1-flag-between-branches | defect | round 1's: `if (FLAG) await import(…)` between the branches | **fail** (text row) | fail | pass | pass |
| R2-flag-createRequire-before-daemon | defect | round 1's: a `createRequire` load behind the flag, before the daemon line | **fail** (text row) | fail | pass | pass |
| R3-runtime-hook | defect | round 1's: a runtime short-circuiting hook, then an import, before the daemon line | **fail** (text row) | fail | pass | pass |
| S1-else-if-flag-after-dossier | defect | `  } else if (FLAG) {` / `    await import('@syzygy/three-surface-poc-app/dossier-site');` / `  }` on the dossier branch | **pass 16/16** | fail | pass | pass |
| S2-same-line-if-after-dossier | defect | the dossier close becomes `  } if (FLAG) await import(…);` | **pass 16/16** | fail | pass | pass |
| S3-else-if-flag-after-polaris | defect | S1's `else if` on the polaris branch | **pass 16/16** | fail | pass | pass |
| S4-else-runtime-hook-after-dossier | defect | `  } else {` holding R3's hook and import, on the dossier branch: unconditional | **pass 16/16** | fail | pass | pass |
| S5-else-createRequire-flag-after-polaris | defect | R2's `createRequire` load in an `else if (FLAG)` on the polaris branch | **pass 16/16** | fail | pass | pass |
| S6-misindented-close-after-dossier | defect | the dossier branch closed by `    } if (FLAG) {` (4 spaces), import, `  }` | **pass 16/16** | fail | pass | pass |
| E-comment-in-branch | equivalent | the lane's | pass | fail | pass | — |
| E-renamed-binding | equivalent | the lane's | pass | fail | pass | — |
| E-branch-swap | equivalent | the lane's | pass | fail | pass | — |
| E-type-only-import | equivalent | the lane's (residual N6) | fail (text) | fail | fail | — |
| C1-comment-outside-branches | equivalent | a header comment naming the package | fail (text) | fail | fail | — |
| L1-else-if-chain | equivalent | `  } else if (argv[0] === 'polaris') {`, its comment moved inside | **fail** (text: `expected -1 to be greater than -1`) | **pass** | fail | — |
| L2-nested-function-in-dossier | equivalent | the dossier import inside a nested async function | pass | fail | pass | — |
| L3-nested-try-in-polaris | equivalent | the polaris import inside a nested `try` | pass | fail | pass | — |
| D1-polaris-after-daemon | structural | the polaris branch moved below the `let parsed` line | fail (text) | fail | fail | — |

- [Observed] **R1, R2 and R3 now fail the new test**, at the narrowed text row only. They pass the 447d9f08 test and fail
  the old pin. This equals the lane's `daemon-entry-{head,prior-test,base-test}.json`.
- [Observed] **S1–S6 each pass all 16 new rows and all 133 static rows, and fail the old pin's row** ("each import is
  dynamic and inside the `dossier` or `polaris` branch"). That is F1.
- [Observed] **The loads are real** (`tools/de_r2_demonstrate.py`, an adaptation of round 1's tool). It runs the built
  mutant's `--help` with the PR's own hook text preloaded, and separately under `strace -f -e trace=openat`. Each row is
  `(flag, exit, hookLoggedPocUrls, straceOpenedPocDistFiles)`:
  - S1: `(None, 0, 0, 0), ('1', 0, 6, 6)`;
  - S2: `(None, 0, 0, 0), ('1', 0, 6, 6)`;
  - S4: `(None, 0, 0, 6), ('1', 0, 0, 6)`. S4 loads six POC-app files on every `--help`, with or without the flag, and
    the test's hook sees none of them.
- **The confinement predicate, on the three cases the brief names.** [Observed]
  - **A block that nests.** Properly indented nested constructs pass: L2 (a nested function) and L3 (a nested `try`).
    Nesting is judged by indentation, though, not by syntax. A close at the wrong indentation (S6), or an `else` attached
    to the close (S1, S3, S4, S5), moves the window's end to a later `  }`.
  - **A comment that names the app.** Inside a branch it passes (E-comment-in-branch). Outside one it fails (C1),
    exactly as the record's residual says.
  - **The daemon path first.** If a branch closes after the `let parsed` line, the row fails (D1). Row mutant T1 shows
    that check is live (section 3.3).
- [Observed] **The dropped equivalents** (E-comment-in-branch, E-renamed-binding, E-branch-swap) still pass 16/16.
  L1 is a further legitimate shape that the new row fails and the old pin passes. That is F2.

### 3.2 The same mutants on the local merge with main (`tools/de_r2_merge_mutants.py`, `results/de-r2-merge-mutants.json`)

The merge is `9b1b8c83`, which is 9e00252a plus `d38d7a3c`, after `npm ci` and `npm run build`. Its static population is
165 rows.

| Mutant | New | Old pin | 447d9f08 test | Static (165) |
|---|---|---|---|---|
| control | 16/16 pass | 15/15 pass | 16/16 pass | 165/165 pass |
| S1-else-if-flag-after-dossier | **pass 16/16** | fail | pass | pass |
| S4-else-runtime-hook-after-dossier | **pass 16/16** | fail | pass | pass |
| L1-else-if-chain | **fail** (text) | pass | fail | — |
| X1-close-failed-callback-in-main: a load in main.ts's `closeFailed` callback | fail (text) | fail | fail | pass |
| X2-close-failure-in-http-host: a load in `packages/http-host/src/shutdown.ts`'s close-failure branch | **pass 16/16** | **pass** | pass | pass |
| X3-shutdown-in-http-host: a load in http-host's `shutdown` function | fail (hook row) | pass | fail (hook) | pass |

- [Observed] F1 and F2 hold on the merge.
- [Observed] X2 passes every test at base and head alike: N1.
- [Observed] In the merged main.ts the lane's `P-shutdown` and `P-close-failure` fragments occur 0 times:
  `'      if (closing) return;\n'` and `'      void daemon.close().then(resolve, (cause: unknown) => '` both count 0.

### 3.3 Row mutants of the kept text row (`tools/text_row_mutants_r2.py`, `results/text-row-mutants-r2.json`)

**Method.**
- The tool runs only the text row (`-t`), which reads main.ts from disk, so no build is needed.
- Its main.ts population has 31 variants:
  - the control;
  - every main.ts mutant of 3.1;
  - the lane's 9 main.ts P- defects;
  - three variants written for these row mutants:
    - V1, no line naming the app (computed specifiers);
    - Q1, R1 with a template-literal specifier;
    - Z3, a renamed dossier opening plus a top-level flagged load.
- Each row mutant runs against the control and its declared killer. The suspected equivalents run against all 31
  variants.

[Observed] With the row unmutated, 12 of the 31 pass: the control, E-branch-swap, E-comment-in-branch, E-renamed-binding,
L2, L3, and S1–S6. The other 19 fail.

| Row mutant | Edit | Variants run | Killed by |
|---|---|---|---|
| T1-no-daemon-after-close | drop `expect(daemon).toBeGreaterThan(close)` | 2 | D1 |
| T2-non-strict-window | `index > open && index < close` → `>=`/`<=` | 31 | **survives**: equivalent. The open and close lines are exact strings that cannot name the app. |
| T3-no-vacuity-guard | drop `expect(naming.length).toBeGreaterThan(0)` | 2 | V1 |
| T6-every-block | `!blocks.some(` → `!blocks.every(` | 1 | control |
| T7-dossier-block-only | the polaris opening dropped from `blocks` | 1 | control |
| T9-no-close-after-open | drop `expect(close).toBeGreaterThan(open)` | 31 | **survives**: redundant. With `close = -1` and the block naming the app, the naming check fails anyway. |
| T12-no-open-found | drop `expect(open).toBeGreaterThan(-1)` | 3 | **survives**: redundant. `close` is set to −1 whenever `open` is −1, so the T9 check fails instead (`expected -1 to be greater than -1` under Z3 and L1). |
| T14-quoted-specifier-only | name test `'@syzygy/three-surface-poc-app` only | 2 | Q1 |

The three survivors are equivalent or mutually redundant guards, not gaps. None needs a fix.

### 3.4 The F1 fix, checked in scratch (`tools/fix_check_r2.py`, `tools/fix_row_r2.ts.txt`, `results/fix-check-r2.json`)

**What I changed, in scratch only.** This is not a proposal of exact bytes. I replaced the kept row with one that finds
the branches by syntax, with `ts.createSourceFile`, the way `argv.test.ts` and `subpath-imports.test.ts` already use the
compiler API:
- in `main()`'s body, and in `else` chains, find exactly one `if` whose condition text is `argv[0] === 'dossier'`, and one
  for `'polaris'`;
- each may have no `else` except the other branch;
- each must end before the `let parsed = parseCli(` statement;
- every occurrence of `three-surface-poc-app` in main.ts must lie inside one branch's then-block.

[Observed] Over the same 31 variants:
- **it fails all 18 defects:** R1–R3, S1–S6, and the lane's 9 P- defects. S1, S3, S4 and S5 fail with
  `expected false to be true` (the `else` check); S2 and S6 fail at the confinement check, with
  `expected [ Array(1) ] to deeply equal []`;
- it fails D1, V1, Q1 and Z3;
- **it passes the control, E-comment-in-branch, E-renamed-binding, E-branch-swap, L1, L2 and L3;**
- E-type-only-import and C1 still fail, so residual N6 is unchanged.

A textual tightening is not enough. Requiring the first line at indentation of two spaces or less after the opening to
equal `  }` would still pass S6. [Inferred: by the predicate's definition; not run.]

### 3.5 The record (`tools/record_check_r2.py`, `results/record-check-r2.txt`: `TOTAL FAIL 0`)

[Observed] All read from git objects at 9e00252a:
- **Subject and files.**
  - The evidence commit `bb5df680` is an ancestor of the head.
  - The 10 test-file digests and `testDiffSha256` are re-derived.
  - The record's `files` covers all 24 tracked evidence files except itself, with every digest equal.
- **Cases and tools.**
  - `mutant-cases.json` is unchanged from `bb5df680` to 9e00252a (`80a34aae115f…`).
  - The cases digest in each of `bound-and-pin-mutants.json`, `cpu-separation.json` and `cpu-separation-node22.json` is
    the retained file's (N4).
  - Every result's tool digest equals its tool at 9e00252a.
- **Both separations, re-derived from the runs.** In each, every site has 10 head runs, each exit 0. Head max and mutant
  min are re-derived from the runs (a capped run counts at its reading; a mutant row counts when its min is at least 10×
  the head max). Each equals the recorded figure, and the record's ratios equal the re-derived ones:

  | Bound | Node 24 thread CPU (722231fe): head max / mutant min | bound ÷ head, mutant ÷ bound | Node 22 process CPU (bb5df680): head max / mutant min | bound ÷ head, mutant ÷ bound |
  |---|---|---|---|---|
  | EDGE_TRIM 1,900 | 64.686 / ≥ 60,066.3 | 29.37×, 31.61× | 88.331 / ≥ 60,019.1 | 21.51×, 31.59× |
  | HOSTILE_LINE 140 | 2.042 / 15,327.977 | 68.56×, 109.49× | 1.631 / 17,314.492 | 85.84×, 123.67× |
  | TAG_SCAN 1,500 | 66.144 / ≥ 60,021.3 | 22.68×, 40.01× | 64.521 / ≥ 60,007.8 | 23.25×, 40.01× |
  | ATTRIBUTE_SCAN 3,000 | 148.918 / ≥ 60,001.8 | 20.15×, 20.00× | 191.092 / ≥ 60,008.8 | 15.70×, 20.00× |

  - These equal the PR body's table, rounded.
  - The geometric means now are 1900, 170, 1900 and 2900 on Node 24, and 2300, 160, 1900 and 3300 on Node 22.
- **Daemon entry.** R1–R3 give `exit 1 passed 15` against the new test, failing the narrowed row only. They give
  `exit 0 passed 16` against the 447d9f08 test and `exit 1 passed 14` against the old pin. The three dropped equivalents
  give `exit 0 passed 16` against the new test.
- **N4 timeouts.** The record says `fail (by the test timeout)` on exactly 4 sides: `reader-blocking-open/head`,
  `reader-no-depth-cap/base`, `reader-no-depth-cap/head` and `started-waits-for-bound/head`. Those are the 4 sides with a
  `byTimeout` row, as the PR body says.
- **N2 dispositions.** The record lists 2 kept: `self-corpus.test.ts:11 (base), PINNED_MAIN` and
  `redis-shaped-discovery.test.ts:152,159 (base), the two [Observed] rows`.
  - I checked the self-corpus disposition's claims: `.github/workflows/node-ci.yml:42` reads `fetch-depth: 0` under a
    comment on keeping the denominator, and the M7 record binds `133106eb…` at `.profile.pinnedGovernedCommit`.

### 3.6 Rule-6 mutants against `build_record.py` (`tools/build_record_mutants_r2.py`, `results/build-record-mutants-r2.json`)

**Method.** Each mutant edits one retained result file in a scratch clone at 9e00252a and reruns `build_record.py … c104771f
8ff50172 bb5df680 447d9f08`. The evidence directory is restored by `git checkout` after each.

| Mutant | Edit | Should | Exit | Result |
|---|---|---|---|---|
| control | none | pass | 0 | — |
| K1-thread-headMax-9.97x | Node 24 ATTRIBUTE_SCAN `headMaxMs` 148.9 → 301 | fail | 1 | killed: `ATTRIBUTE_SCAN_CPU_MS: not 10x from both sides` |
| K2-thread-mutantMin-9.67x | Node 24 ATTRIBUTE_SCAN `mutantMinMs` → 29,000 | fail | 1 | killed |
| **K3-node22-headMax-9.97x** | Node 22 ATTRIBUTE_SCAN `headMaxMs` 191.1 → 301 | fail | **0** | **survives**; the record carries `headMaxMs: 301.0` beside `boundOverHeadMax: 15.7` |
| **K4-node22-mutantMin-9.67x** | Node 22 ATTRIBUTE_SCAN `mutantMinMs` → 29,000 | fail | **0** | **survives**; the record carries `mutantMinMs: 29000.0` beside `mutantMinOverBound: 20.0` |
| **K5-node22-recorded-margin-9.5x** | Node 22 ATTRIBUTE_SCAN `fileBound.overHeadMax` → 9.5 | fail | **0** | **survives**; the record's `underProcessCpuFallback.boundOverHeadMax` reads **9.5** |
| K6-node22-separated-false | Node 22 ATTRIBUTE_SCAN `fileBound.separated` → false | fail | 1 | killed: `… not 10x from both sides under the process-CPU fallback` |
| **K7-thread-headRun-over-max** | one Node 24 ATTRIBUTE_SCAN head-run region → 400 ms (7.5×), `headMaxMs` left at 148.9 | fail | **0** | **survives** |
| K8-node22-cases-digest | Node 22 `cases.sha256` → zeros | fail | 1 | killed |
| K9-node22-on-node24 | Node 22 `node` → `v24.6.0` | fail | 1 | killed |
| K10-de-head-S1-shape-R1-passes | R1 recorded as passing the new test | fail | 1 | killed: `R1-flag-between-branches: the narrowed text row passes it` |
| K11-de-prior-R2-fails | R2 recorded as failing the 447d9f08 test | fail | 1 | killed |
| K12-de-head-equivalent-fails | E-branch-swap recorded as failing the new test | fail | 1 | killed: `E-branch-swap: an equivalent the new test fails` |
| K13-mutants-timeout-text | reader-no-depth-cap's `byTimeout` flags cleared | wording only | 0 | the record then says `fail`, not `fail (by the test timeout)` |

[Observed] The survivors are K3, K4, K5 and K7, and they are F3. Line 87 checks only `fileBound.ms` and
`fileBound.separated`, then copies `fileBound.overHeadMax` and `fileBound.mutantMinOver` into the record. Line 94
recomputes both margins from `headMaxMs` and `mutantMinMs` on the thread path. Neither path derives those two figures
from the runs.

### 3.7 N1: Node 22, re-measured (`tools/cpu_sep_r2.py`, `results/cpu-sep-r2-node22.json`)

**Method.**
- `PATH` puts v22.18.0 first, where `typeof process.threadCpuUsage` is `undefined`, so the tests' helper reads
  `process.cpuUsage()`. The tree is 9e00252a.
- It uses round 1's method: 10 head runs per site, and 10 runs per mutant row with no early stop.
- Each cap is 11× the committed bound, read from `/proc/<pid>/stat` (the whole worker process), so a capped run proves at
  least 11×. HOSTILE_LINE runs to completion.

| Bound | Head max (10 runs) | Bound ÷ head max | Mutant min (capped runs / runs) | Mutant min ÷ bound | load1 |
|---|---|---|---|---|---|
| EDGE_TRIM 1,900 | 66.953 ms | 28.4× | ≥ 20,911.4 ms (10/10) | ≥ 11.0× | 47.9–74.7 |
| HOSTILE_LINE 140 | 2.059 ms | 68.0× | 16,949.268 ms (0/10) | 121.1× | 64.7–84.4 |
| TAG_SCAN 1,500 | 88.029 ms | 17.0× | ≥ 16,501.9 ms (opening and plural, 10/10 each) | ≥ 11.0× | 40.9–89.3 |
| ATTRIBUTE_SCAN 3,000 | 194.649 ms | 15.4× | ≥ 33,014.2 ms (10/10) | ≥ 11.0× | 41.0–86.0 |

- [Observed] Every head run exited 0. The near-miss row is again not reached (`19.479` ms).
- [Observed] **All four bounds keep both 10× margins under the process-CPU fallback, at heavier load than the lane's
  (load1 to 89, against 26–48).** My TAG_SCAN head maximum (88.0 ms, 17.0×) is higher than the lane's (64.5 ms, 23.2×).
  The tightest head-side margin is ATTRIBUTE_SCAN at 15.4×, against the lane's 15.7×.
- [Observed] On Node 22.18 the three CPU files give `Tests  94 passed (94)` at 9e00252a
  (`results/node22-cpu-files-9e00252a.log`). Round 1 recorded 7 failed of 94 at 447d9f08.
- **"Kept, not refitted, while both margins hold" is a sound rule.**
  - [Inferred] Three of the capped mutant minima are cap artefacts: 60 s for the lane, 11× for me. So a "geometric mean"
    tracks the cap and the head run's noise, not the code.
    - The lane's means moved, for example ATTRIBUTE_SCAN 2900 on Node 24 and 3300 on Node 22.
    - Refitting would churn the constants without changing what they separate.
  - What the rule needs is that both margins are re-checked whenever the evidence is rebuilt. F3 is where that check is
    weaker than claimed.

### 3.8 AC1 census at the head (`tools/census_rev.mjs`, round 1's tool unchanged; `results/census-rev-9e00252a.json`)

[Observed]
- The census gives `{"population":250,"comparisons":16,"raceTimers":1,"clockReads":44}`.
- A second method, plain token counts over the same 250 files, gives `{'Date.now(': 30, 'performance.now(': 0, 'new
  Date()': 8, 'process.threadCpuUsage(': 3, 'process.cpuUsage(': 3, 'process.hrtime': 0}`, which sums to 44. The two
  methods agree.
- The 16 comparisons are the same classes as round 1, at shifted lines:
  - 4 CPU bounds (`dossier-profile.test.ts:182`, `excerpt.test.ts:273`, `test-artifact-verification.test.ts:111` and
    `:118`);
  - 7 poll-deadline comparisons;
  - 5 non-clock comparisons.
- 0 are wall-clock elapsed assertions. The read count fell from 45 to 44 because the 7 `threadCpuUsage` reads became 3
  helpers × 2 reads, and the 4 region starts now call the helper.
- **AC1 still holds.**

### 3.9 Suites and gates

[Observed]

| Run | Tree | Result | load1 start → end |
|---|---|---|---|
| full `npx vitest run`, #1 | 9e00252a | `6 failed | 5230 passed | 70 skipped (5306)`. The failures are 6 × `Test timed out in 5000ms` (`start-gates` 4, `gate-acts` 1, `review` 1) and 1 `Hook timed out in 10000ms` (`act-families`, 65 rows skipped). 0 are in subject files. | 69.1 → 57.1 |
| full, #2 | 9e00252a | `2 failed | 5299 passed | 5 skipped (5306)`, both `start-gates` timeouts; 0 in subject files | 60.1 → 49.6 |
| full, #3 | 9e00252a | **`5301 passed | 5 skipped (5306)`**, exit 0 | 44.0 → 37.3 |
| full, #1 | merge 9b1b8c83 | `1 failed | 5373 passed | 5 skipped (5379)`, a `start-gates` timeout; 0 in subject files | 63.5 → 63.8 |
| full, #2 | merge 9b1b8c83 | **`5374 passed | 5 skipped (5379)`**, exit 0 | 30.1 → 45.4 |
| `npm run test:system` | 9e00252a | `49 passed | 1 skipped (50)` | 72.3 → 72.1 |
| `npm run test:system` | merge | `49 passed | 1 skipped (50)` | 59.5 → 63.0 |
| the 4 failing files alone | 9e00252a | `6 failed | 293 passed | 65 skipped (364)` | 65.0 → 71.4 |
| the same 4 files alone | 8ff50172 | `6 failed | 293 passed | 65 skipped (364)`, the same counts | 65.1 → 79.0 |
| `start-gates.test.ts` alone, alternating, 3 × each | 8ff50172 / 9e00252a | `104 passed (104)` all 6 times | 40.4–64.2 |

- [Observed] The 10 changed test files are imported by no module under `apps/` or `packages/`: a `git grep -F "/<name>.js"`
  for each of the 10 returns 0 files.
- [Inferred] Every red run above failed only by vitest's default 5 s test or 10 s hook timeouts. The failures are in files
  the PR neither changes nor reaches, and the same files fail with identical counts at 8ff50172 under the same load. They
  are not attributable to this change (N3).
- [Observed] Gates at 9e00252a:
  - `npm run typecheck` exit 0, and `npm run build` on the merge exit 0.
  - `python3 scripts/check_governance.py` exit 0, ending `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not
    asserted`. A grep of its output for the bead or any of the 10 test files returns nothing.
  - `python3 scripts/check_quotations.py` exit 0.
- [Unknown] I did not run the canonical battery; the lane reports `commands=110 nonzero=0`.

## 4. Round-1 findings: resolved?

- **F1 (kept text row wider than the two branches): not resolved.**
  - [Observed] Round 1's three survivors are killed: R1, R2 and R3 fail the narrowed row (3.1).
  - [Observed] P-daemon-dynamic now fails the text row as well (3.3: `lane:P-daemon-dynamic` fails the unmutated row).
  - [Observed] The row is renamed, and its comment states the intended predicate.
  - [Observed] But the predicate finds a branch's end by line text. So the class round 1 named, "a daemon-path load the
    old pin caught that every test now passes", still has six members (S1–S6). The row's name still states more than it
    checks (bar 7, `:82-83`). Round 1's own scratch fix used the same "first following `  }`" rule. Round 1 did not test
    an `else` or a same-line close, so this gap is shared with the round-1 proposal. See F1 below.
- **N1 (`engines` admits Node versions that lack `threadCpuUsage`): resolved.**
  - [Observed] The helper falls back to `process.cpuUsage()`, the CPU files pass 94/94 on 22.18, and all four bounds keep
    10× margins under the fallback in the lane's run and in mine (3.7).
  - No row is skipped, so the property is not passed unseen.
  - The record's check of those margins is weaker than claimed: F3.
  - The helper comment's version wording is note N2.
- **N2 (two exact pins without a disposition): resolved.**
  - [Observed] `self-corpus.test.ts:11-13` and `redis-shaped-discovery.test.ts:154-155` carry the reasons, and the record
    lists both as `disposition: kept`.
  - [Observed] The self-corpus reasons check out: node-ci's `fetch-depth: 0` and the M7 record's `pinnedGovernedCommit`.
  - As the coordinator accepted, `self-corpus.test.ts` is now a #532 file. Its hunk does not overlap #537's, and the trial
    merge is clean (section 1).
- **N3 (the near-miss case's bound has no mutant of its own): resolved.**
  - [Observed] The comment sits above `it.each` at `test-artifact-verification.test.ts:101-102`. It is one sentence,
    wrapped over two lines.
  - [Inferred] Its claim, "the replaced scan is linear on it too", agrees with the mutant row's figures in the retained separations:
    16.378–20.166 ms over 10 runs on Node 24 thread CPU, and 20.723–23.846 ms over 10 runs on Node 22 process CPU.
- **N4 (the record's links to its inputs): resolved.**
  - [Observed] The cases digest is recorded and checked: K8 is killed.
  - [Observed] Timeout failures are worded `fail (by the test timeout)` on exactly the 4 sides with a `byTimeout` row
    (3.5). The wording follows the flags (K13).
- **N5, N6 and N7** are not in the repair, as the brief says. N1 and N3 below add figures to N5 and N7.

**Scope: what the repair changes beyond round 1's asks.** [Observed] Every item stays within the 6 test files and the
evidence directory.
- **The bound comments** in the three CPU files now read "kept, not refitted to each re-measurement, while both margins
  hold". This is the lane's method change, which the coordinator accepts. I find no defect in the rule (3.7).
- **The region starts.** The four `const cpu = process.threadCpuUsage();` lines become `cpuUsage()`. That belongs to the
  N1 fix.
- **Evidence tools:**
  - `cpu_separation.py` gains `CPU_SOURCE` and `fileBound`;
  - `build_record.py` gains the fallback, prior-test, R-mutant, dropped-equivalent and cases-digest checks;
  - `daemon_entry_probe.py` gains R1–R3;
  - `bound_and_pin_mutants.py` gains `byTimeout`.
- **Re-run evidence.** The mutants were re-run at `bb5df680` (65 of 65 sides as expected), the head census was re-run,
  and so were both separations and the three daemon-entry runs. Two files are new: `cpu-separation-node22.json` and
  `daemon-entry-prior-test.json`.
- [Observed] There is no product file, no path under `.syzygy/` or `openspec/`, and no row-count change. `rowDelta` is
  still `Tests: +2 ~17 -1`.

## 5. New findings

### F1 — blocking. The narrowed text row still lets six daemon-path loads that the old pin caught pass every test

- **Severity:** blocking. The brief's REVISE rule names "a daemon-path load the old pin caught that the new row passes".
  This is round 1's F1 class, which the repair was meant to close, and the guard is class 1.
- **Evidence.**
  - The row finds each block as `close: open === -1 ? -1 : lines.indexOf('  }', open + 1)`
    (`daemon-entry-unchanged.system.test.ts:249`), and counts a naming line as confined when
    `index > open && index < close` (`:259`).
  - The first following line equal to `  }` is the branch's syntactic end only when nothing is attached to the close. In
    the following cases the window runs on over code that executes on every non-dossier, non-polaris argv:
    - `  } else if (…) {` and `  } else {` (S1, S3, S4, S5);
    - a close that shares its line with a statement, `  } if (…) …` (S2);
    - a close at another indentation (S6).
  - [Observed] S1–S6 each pass all 16 daemon-entry rows and all 133 static rows at 9e00252a, and fail the old pin's row
    (3.1). S1 and S4 do the same on the merge with main (3.2).
  - [Observed] The loads happen:
    - S1 and S2 load 6 POC-app modules on `--help` with the flag set (hook 6, strace 6);
    - S4 loads them on every `--help` with no flag, invisible to the test's hook (hook 0, strace 6).
  - The row's comment says "before the first following line that closes it, `  }`". Its name says "sits inside the
    `dossier` or the `polaris` branch". Neither holds for these shapes (bar 7, `:82-83`).
- **Failure scenario.**
  - Someone warms the renderer for the daemon by extending the dossier branch:
    `  } else if (process.env.SYZYGY_PRELOAD_RENDERER === '1') {` /
    `    await import('@syzygy/three-surface-poc-app/dossier-site');` / `  }`.
  - At base, the text pin goes red (three mentions). At 9e00252a, all 16 daemon-entry rows and the four static files
    stay green.
  - An operator who sets the variable runs a daemon that has loaded the POC app.
  - The `else { …runtime hook… }` form (S4) does the same on every invocation, with no variable at all.
- **Proposed fix.**
  - Find the branches by syntax, with the TypeScript compiler API, which `argv.test.ts` and `subpath-imports.test.ts`
    already use in unit tests:
    - the one `if` in `main()` (or in an `else` chain there) whose condition is `argv[0] === 'dossier'`, and the one for
      `'polaris'`;
    - each may have no `else` except the other branch;
    - each must end before the `let parsed = parseCli(` statement;
    - every occurrence of `three-surface-poc-app` in main.ts must lie inside one branch's then-block.
  - Checked in scratch (3.4): it fails all 18 defects in the population (R1–R3, S1–S6 and the lane's 9 P-) and D1. It
    passes the control, the three dropped equivalents, L1, L2 and L3.
  - A textual rule on indentation would still pass S6.
  - Add S1–S6, or equivalents with an `else`, a same-line close and a misindented close, to `daemon_entry_probe.py`'s
    population. Have `build_record.py` require each to fail the new test and the old pin. Re-run the old-against-new
    stand-in.

### F2 — blocking (by the brief's rule). A legitimate shape, an `else if` chain of the two branches, fails the new row and passed the old pin

- **Severity:** blocking under the brief's REVISE rule, "a legitimate branch shape the new row fails". It fails closed
  (a refactor goes red), so it is less severe than F1. It has been present since 447d9f08: the prior test fails it too.
- **Evidence.** [Observed]
  - In L1, the dossier block closes with `  } else if (argv[0] === 'polaris') {` and the polaris comment moves inside.
  - L1 fails the new row with `expected -1 to be greater than -1`, because `lines.indexOf("  if (argv[0] === 'polaris')
    {")` is −1.
  - The old pin passes L1 (15/15), since it located the branch with `main.indexOf("if (argv[0] === 'polaris') {")`, a
    substring. The 447d9f08 test fails it as well.
  - Nothing on any daemon path loads the POC app in L1. Bar 1 (`:52-54`): "A pure refactor should not break tests".
  - Holds on the merge (3.2).
- **Failure scenario.** A maintainer chains the two argv checks, a common style. The text row goes red with an
  index-of-minus-one message that does not name the defect. The likely repair is to loosen the row by hand.
- **Proposed fix.** F1's syntax-based row passes L1 (3.4). Add L1 to the probe's equivalents, and have `build_record.py`
  require that it pass.

### F3 — blocking (by the brief's rule). The Node 22 margin check trusts the producer's flag, and a recorded sub-10× margin builds green

- **Severity:** blocking under the brief's REVISE rule, "a margin check that passes a sub-10× margin".
  - The committed figures are correct: I re-derived them (3.5).
  - The check is what is weaker than its docstring.
  - The fix needs no re-measurement.
- **Evidence.** [Observed] (3.6)
  - On the fallback path, `build_record.py:87` refuses a site only when `fileBound.ms != b or not fileBound.separated`.
  - `:88-89` then copy `fileBound.overHeadMax` and `fileBound.mutantMinOver` into the record as `boundOverHeadMax` and
    `mutantMinOverBound`.
  - K5, setting `overHeadMax` to 9.5, exits 0 and writes **9.5** into `underProcessCpuFallback`.
  - K3 (head max giving 9.97×) and K4 (mutant min giving 9.67×) exit 0.
  - On the thread path (`:94`) K1 and K2 are killed.
  - Neither path derives `headMaxMs` or `mutantMinMs` from `headRuns` and `mutants[].runs`. K7, a head run at 400 ms
    (7.5×) with the maximum left at 148.9, exits 0 on the thread path.
  - The docstring claims (`:10-12`, `:22-23`) "Every digest and total is computed here …" and the 10× check "on thread
    CPU and under the process-CPU fallback alike". AGENTS.md rule 3 says "totals are computed", and rule 6 says "Mutate
    the input and confirm the check fails, per predicate".
- **Failure scenario.**
  - A later re-measurement on Node 22 under heavier load, or a hand-merged result file, carries a head maximum past
    bound ÷ 10.
  - If the producer's flag is stale or edited, the record rebuilds green, states the sub-10× figures, and the comments'
    "while both margins hold" goes unchecked.
- **Proposed fix.**
  - In `build_record.py`, for both separations, derive `headMaxMs` as the maximum region over `headRuns`.
  - Derive `mutantMinMs` as the minimum over reached rows: a capped run counts at its reading, and a row is reached when
    its min is at least 10× the head max. My `record_check_r2.py` does this and agrees with the committed figures.
  - Require both to equal the recorded figures, check `b / headMax >= 10` and `mutantMin / b >= 10` on both paths, and
    write the recomputed ratios into the record, never `fileBound`'s.
  - Re-run K3, K4, K5 and K7 to confirm each now fails.

### N1 — note. After main's #529, the close-failure branch body lives in `@syzygy/http-host`; a load there passes every test, and two probe fragments no longer apply

- **Evidence.** [Observed] (3.2)
  - On the merge, a load in `packages/http-host/src/shutdown.ts`'s close-failure branch (X2) passes all 16 new rows, the
    old pin, the 447d9f08 test and the 165 static rows.
  - A load in main.ts's `closeFailed` callback (X1) is still caught by the text row, and one in http-host's `shutdown`
    (X3) by the hook row.
  - The lane's `P-shutdown` and `P-close-failure` `old` fragments occur 0 times in the merged main.ts.
  - [Inferred] So, after main is merged, a re-run of `daemon_entry_probe.py` records those two as skipped with
    `failed: []`. `build_record.py:164` (`a defect the new test passes`) would then refuse to rebuild the record.
- **Failure scenario.**
  - The kept row's comment says it covers a load "on a start or close failure". After the merge, that holds for main.ts's
    callback only.
  - A provider or POC load added to http-host's close-failure path lands with every test green. This is the same class as
    round 1's N5, now with the code moved out of the file the row reads.
- **Proposed fix.**
  - In the follow-up bead for round 1's N5, extend the check to `closeOnSignal` in `packages/http-host/src/shutdown.ts`,
    or have a row drive a failing close under the hook.
  - Re-target `P-shutdown` and `P-close-failure` to the merged code (`X3` and `X1`/`X2` above) when the probe is next run.

### N2 — note. The helper comment names only Node 22 as the fallback's range

- **Evidence.**
  - The three helpers' comments read "CPU time so far: this thread's (`process.threadCpuUsage`, Node 23.9 and later)
    or, on the Node 22 releases `engines` admits, the whole process's (`process.cpuUsage`)"
    (`dossier-profile.test.ts:13-14`, `excerpt.test.ts:6` and `test-artifact-verification.test.ts:23` each open with
    that text; `git grep -F 'Node 22 releases'` over `apps/` and `packages/` returns exactly those 3 lines).
  - The root `package.json` has `"node": ">=22.15"`, which also admits 23.0–23.8. Those releases take the fallback,
    and the comment names neither range for them. @types/node 26.2.0 marks `threadCpuUsage` `@since v23.9.0`.
  - [Unknown] Whether any 22.x release has `threadCpuUsage`: the only 22.x on this host, 22.18, lacks it.
  - The behaviour is correct either way, because the helper tests `typeof process.threadCpuUsage === 'function'`.
- **Proposed fix.** Say "where `process.threadCpuUsage` is absent (Node before 23.9)". This can ride with F1–F3's
  re-commit.

### N3 — note. Full-suite runs under load fail by default timeouts in files this change does not reach (adds figures to round 1's N7)

- **Evidence.** [Observed] (3.9)
  - Of 5 full runs, 3 failed: 2 of 3 at 9e00252a, and 1 of 2 on the merge. All 9 failed rows, plus one 10 s hook timeout,
    were vitest's default 5 s timeouts in `start-gates`, `gate-acts`, `review` and `act-families`. None is a subject file.
  - The same four files alone give identical counts at 8ff50172 and 9e00252a under the same load.
  - `start-gates.test.ts` alone passes 104/104 three times at each.
  - One run at each tree was green at load1 30–45.
- **Proposed fix.** None in this PR. Attach the figures to `syzygy-bpyt.4.31`, or to round 1's N7 follow-up.
  - `start-gates.test.ts` "pins the consented HEAD, records the subject and writes only run.json under the state root"
    failed in all 5 red runs: the 3 red full runs and both isolated runs (8ff50172 and 9e00252a). It is the first
    candidate for a reasoned timeout.
  - #537 does not touch that file.

## 6. Changed outputs

There are none. [Observed]
- The repair's 18 paths are 6 test files and 12 evidence files. 0 are product files, and 0 are under `.syzygy/` or
  `openspec/`.
- The rows that pin the daemon entry's usage, refusal strings and exit codes pass 16/16 at 9e00252a and on the merge.
- The system suite gives `49 passed | 1 skipped (50)` at both.
- What changes is what the test suite refuses: R1–R3 are refused now, S1–S6 are still accepted (F1), and L1 is refused
  (F2).

## 7. Test quality

- **Better than round 1.**
  - R1–R3 and P-daemon-dynamic are killed by text.
  - The CPU bounds stay live on Node 22 (94/94) rather than throwing, with 10× or more on every side; the tightest
    head-side margin in my run is 15.4×.
  - The record now carries the cases digest and the timeout wording. Of my 12 `build_record.py` mutants that should
    fail, it kills 8 (K1, K2, K6 and K8–K12); K13 changes wording only, as expected. It also checks that R1–R3 were survivors at 447d9f08.
  - The kept row's vacuity guard (T3), daemon-order check (T1) and naming test (T14) are each live.
- **Still weak.**
  - The text row's confinement is textual (F1), and it fails a legitimate chain (F2). Its name states more than it checks
    (bar 7).
  - The fallback margin check trusts a flag (F3).
- **Equivalent row mutants**, named as the brief asks: T2 (strict or non-strict window), T9 and T12. T9 and T12 are
  mutually redundant guards. None is a gap.
- **Unchanged residuals.** Disclosed by the lane and still true:
  - the type-only import and the out-of-branch comment fail the row (N6; C1 confirms the comment case);
  - the ASCII-only byte fixtures;
  - the FIFO capture's blocking open.
- **Determinism (bar 6).**
  - The CPU rows did not fail in any of my 5 full runs, or in 40 head runs under Node 22 at load1 up to 89.
  - The only red rows were the pre-existing timeouts of N3.

## 8. Cleanup

- **Deleted:**
  - my 5 scratch clones (`clone`, `clone-cpu`, `clone-rec`, `clone-merge`, `clone-gates`, all under `rev-532b/`);
  - my TMPDIRs `/tmp/r532b-1` to `/tmp/r532b-16`. `ls -d /tmp/r532b-*` lists 0 afterwards.
- **Never pushed:** the local merge branch `r532b-merge` (`9b1b8c83`). It was deleted with its clone. Nothing was pushed,
  commented on or merged.
- **Daemons:** every daemon I started was a test's own child, on port 0 with a private state directory. `pgrep -af
  'scratchpad/rev-532b|r532b-'` listed no surviving process before deletion.
- **Kept,** under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-532b/`:
  70 files, none over 300 KB, the largest `results/check-governance-9e00252a.log` at 171,839 bytes. Two of them are
  copies:
  - `tools/lane_daemon_entry_probe.py` is byte-identical (`cmp`) to `git show 9e00252a:docs/evidence/syzygy-bpyt-4-5/tools/daemon_entry_probe.py`;
  - `tools/census_rev.mjs` is round 1's tool, unchanged.

| Kept file | sha256 |
|---|---|
| `pr-body.md` | `08c95132af4e0d9533a73d978204b34777d7c626ab4d7cf12ac18b5ea342afd4` |
| `results/build-9e00252a.log` | `598506fd1002083a8b8895ef5213fdd81296d012d6258a5a48b043ba4543ce93` |
| `results/build-merge.log` | `597b358eb98f417637ea8ee02d8d875627f8aea14c146672ac6e228f81cae5a6` |
| `results/build-record-mutants-r2.json` | `28e1bf7cb76cfc6f5e0ea7d0fa6ab188b6a9f80ea3c617f038e7eb106c63495a` |
| `results/build-record-mutants-r2.log` | `e181cada98caaffdb750178b76e58ea91bfff1f2074c49bbf76d535265a186b6` |
| `results/census-rev-9e00252a.json` | `e454f2aba35136e0d248d4d639e78e76d0101bc4df890cb09186221deb81a0c9` |
| `results/census-rev-9e00252a.log` | `0abd6a7bc39947a3ec807a0bdb5f7cee73a05782838e37d8cfece9706dadccc8` |
| `results/check-governance-9e00252a.log` | `586a46da8a2709de2351d13252feef1d4fb71d99d0373065b85e53022053faf3` |
| `results/check-quotations-9e00252a.log` | `9263aaccbc5e85b3f15ecdce7aa1ec184c9f7b0df1b7120e3852f997e54f071f` |
| `results/cpu-sep-r2-node22.json` | `f5eeec15c29ff28a37b2212d906aa9956b3a80a9ee73245fc6100b28c6544a0f` |
| `results/cpu-sep-r2-node22.log` | `2a1be3bc3f0f9906fe5cbe4d247f3ece27ef08b90871e414370c1297c0619303` |
| `results/de-demo-S1-else-if-flag-after-dossier.json` | `5e0258e879cbb14ebcf4de5512f4bf2b5885b12cd0575a53900ff986d44a2690` |
| `results/de-demo-S2-same-line-if-after-dossier.json` | `9cf9902bb89da4ca437ce1c1bf227edf27a67e3b9ce951d6d2c721113805b061` |
| `results/de-demo-S4-else-runtime-hook-after-dossier.json` | `8c221d52c4c8b8a2a79f828509b6013edc1b8198fd5d1ab196cfe4887ef49412` |
| `results/de-demo.log` | `dc24689b89a297d77cd5d26394c5cff6e7dcce71f608455fc16e676e5f1a6773` |
| `results/de-r2-merge-mutants.json` | `d6ffc3fb255d478f022732b5640d9f492bae3fd78590c394f65c3e6e43ecf699` |
| `results/de-r2-merge-mutants.log` | `678dac1be88ff75ffbe8998d6702f3f11fe8a7b5df23b2a38cfccc9804a470a4` |
| `results/de-r2-mutants.json` | `092cbca9396dc45c061155af05878cbcb7006f089ee283ac35aec75ee94534f2` |
| `results/de-r2-mutants.log` | `4a0d0c092c156c36c0b924f5185e4d0032b2b8bdde1f5bf30857b3d2fc5d7ec6` |
| `results/failing-files-isolated-8ff50172.log` | `26988b08ee941a7b1b51dda5bfd528a10bfafa5a7855b68d4aacc02d8a29af8c` |
| `results/failing-files-isolated-9e00252a.log` | `d04d519baee2fad1df9af312bd7d21bb228b177ed96600057e689158b4c68f9f` |
| `results/fix-check-r2.json` | `c58fc863de91e5494cd9cb3b28087a294f14783b47475376e0530e8a7ffb2e34` |
| `results/fix-check-r2.log` | `abd053e1a7150c908c6cf4712807f3c7f530546e8e50275539f6a61efdd3fd4a` |
| `results/full-suite-9e00252a-2.json` | `ba40912cb17c43eed0dbb423f343daafe49dcf7dd3bab6870b2ba9e06715f43f` |
| `results/full-suite-9e00252a-2.meta` | `af16610ab8ff93ae1e055fb2e2cfbd0bbf13518a693b53524da81bc66ff53a22` |
| `results/full-suite-9e00252a-2.tail` | `c0d2471d6793122dacfcacae593f2b02bdaae8c0637b594f94fea42b763fb93a` |
| `results/full-suite-9e00252a-3.json` | `5d7d9841e41d76ff47c1769a8a0e8694d9291dc183d6265646281dbb5d01b670` |
| `results/full-suite-9e00252a-3.meta` | `fca3c22b746487f3ddcc9f9ff4ce69b6005e6f1e60371fb8519687ab2463407a` |
| `results/full-suite-9e00252a-3.tail` | `96b385309faa491b51ee1a2f52d2aabcec84aae9d43c85bcb24882072563d63a` |
| `results/full-suite-9e00252a.json` | `bb5103cb317c7f0b50eba358d3004677d23d16ef3d357204b5940b0e43980df8` |
| `results/full-suite-9e00252a.meta` | `3ca984792f738ef8d487aadb8431a1e6065013dd9d3ac39c9492bdfe5e12338e` |
| `results/full-suite-9e00252a.tail` | `d12416c98975260ef19f313142781488c192f08af0d107b223d6dcb70cfc5173` |
| `results/full-suite-merge-2.json` | `b26892d9b6fe1471f8c374189667720e01de03f7979343c909efa7783070de36` |
| `results/full-suite-merge-2.meta` | `1075efa003b50b8cb11ee7e1df9618db85434cbfc408638a35addf7b67e94882` |
| `results/full-suite-merge-2.tail` | `6c5d5e90c0f2023fa6ce18022d938bae703b1f8557a2cb5d71540f64d2befeff` |
| `results/full-suite-merge.json` | `a70441dcc437fc2047b1aecdc38b3516d404fa60d997b80cb185017800219d81` |
| `results/full-suite-merge.meta` | `3e2cfafcdc62f99df5840399d36aa5184e677ee729103f74aabe8f702fc0ee92` |
| `results/full-suite-merge.tail` | `37ed8dcbf55ac8fe48fb2550f3c328bccf1f7a557144349cf23d6a67f34a3fed` |
| `results/main-moved-paths.txt` | `852c1ead55b0591716ad8d234569fc7093caa57db40ea0c9b679ab0b797548ed` |
| `results/node22-cpu-files-9e00252a.log` | `34ef262bffb8fb3518718a87f6c157bc601cbc5089aa3774fb61422b38542361` |
| `results/npm-ci-9e00252a.log` | `ec863edd1902f393f89dbae6292f427d2c3217791ca8a62b9adbcdc6e529b47b` |
| `results/npm-ci-cpu-clone.log` | `c9ba4f5c5c29651680d46320b9120d5e7c687e4c45a274d57bb0101f7f8092ea` |
| `results/npm-ci-gates.log` | `bc4a2fa8e4ccf148b6324b32229552b2528e9e2bff77c1c186bb9cb9a99a7dd9` |
| `results/npm-ci-merge.log` | `5f7f6c47acdda1d3d17eb294fcba3ffbabcf75225ca81b510dfb98f3131bb6e5` |
| `results/npm-ci-rec.log` | `1e7ce01159794a0de4a2f12d02a1fa6f7b4445ec6db2852748fd1e3421c135ea` |
| `results/record-check-r2.txt` | `fc0e8c313769ea5cd7cc5fcf8dc0f2696d62be527248b65d1b30a4caea981649` |
| `results/start-gates-ab.json` | `de68256facf9542b758c8b4b3b33622a2e453474fbe7e5a61f933f85aa08ca84` |
| `results/start-gates-ab.log` | `0acb17e19f3be3b8260e6a7f97067322683b5727a40794682e072da38901d0c4` |
| `results/subject-paths.txt` | `ea40606bdd1623d7a1c2b4f53ddf8eba99435c3ac57909724e3876c8e739faea` |
| `results/system-suite-9e00252a.meta` | `3eefb2921a16e31ef188daadd649a080e62f1e568e9eb5eb856ce917fe3791dd` |
| `results/system-suite-9e00252a.tail` | `44ad393bbf9ac1aa38b6919ad4c41d3a2c280a1732a2071695b7d81112d0df67` |
| `results/system-suite-merge.meta` | `89881dfc44c21851f7af37329976952e7ea50a69498ad893b5438b69a82b4e43` |
| `results/system-suite-merge.tail` | `4d42fd8039d7839e2ff26d7d7189545c95823340b82839280cfb90bc90b51cf6` |
| `results/text-row-mutants-r2.json` | `88ed0703bcaa093a88ba2d16f755dbbd4c719331c3844a1c8868ac1ff25d92b5` |
| `results/text-row-mutants-r2.log` | `941c1e2f0def7e972cc9dd06f16e8d127e3389d38cc0d5d2a295f6540adae57a` |
| `results/typecheck-9e00252a.log` | `e2c8b37ba8c2974699631485e9c24406b9eb7c793bbbd178345cd4a0f86ce13f` |
| `tools/build_record_mutants_r2.py` | `9aa8199a75bc7913ea80a66df9a3cd80efac0d7c44d4d87c4412e3b00ccace46` |
| `tools/census_rev.mjs` | `79a649be989fe47828012e63b96f986e3e873d71157bdee0fe9a2090fae9525f` |
| `tools/cpu_sep_r2.py` | `4bb117eaf5a5195d51400f6503a33455cd787e4138e9ecdde126cb1c84c56ead` |
| `tools/de_r2_demonstrate.py` | `2da1ca1bbc5fbfdc0e356ec0fc167c2af0ee28b34d3dc79d99ee9c6ee95b83e3` |
| `tools/de_r2_merge_mutants.py` | `8960453a4abe2b4d9f59dab53031e525e85d5c063813525838eded45f2868ae0` |
| `tools/de_r2_mutants.py` | `41e228dfa245613dd7f7caff9c715235a7b73953ce7bd2585e0fab602ebe9d99` |
| `tools/de_r2_predicate_preview.py` | `844c0a2a2cd4a2b932ae9d178ba5c7049e7772404404429328d8499b06350a3e` |
| `tools/fix_check_r2.py` | `987ac6ee78cd6ee8fe8740f9d8741d1aebf3fb815ed281a8151c1b2c2d829216` |
| `tools/fix_row_r2.ts.txt` | `ad82b1f9b23ec3d3cda8c64b455c51cfd7630412243ce65ec38d7cefeed12101` |
| `tools/isolated_ab_r2.py` | `4b5af118670aedfaf83de834072e1557ef5d2ac671ec52e07ef742c8f2d5fb07` |
| `tools/lane_daemon_entry_probe.py` | `b371f924917db4c3cd14b51a0cbc9fb47593303465f1acfb4c44c65815b4bedc` |
| `tools/record_check_r2.py` | `4b44e6243f2e8c97f668f437396e9f5ec20c1934950dc5f115b2a22d5cc3a3fc` |
| `tools/suite_failures_r2.py` | `648acd326d0826eff800c2f9ebf1e87a54610e8c051782ad0ad3ff3c9e17edc2` |
| `tools/text_row_mutants_r2.py` | `a61aaf1536edf96f51f21a8132cf1ed8c368305d24f2ef45c7d29b66722f0ec7` |

This raw is the 71st file. Its own sha256 cannot appear in itself, so it is given in the reply to `main`.
