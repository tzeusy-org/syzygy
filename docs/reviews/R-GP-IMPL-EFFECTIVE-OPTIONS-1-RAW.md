# R-GP-IMPL-EFFECTIVE-OPTIONS-1 — CC-REV-1 implementation review of syzygy-bpyt.65, round 1
Verdict: REVISE
Reviewed commit: 807024b8
Subject: r1-review.diff sha256 4ebb31a8ad5a7a0590d1b4ed89aed42cc907d1efea7acfa59b43e68a37b6df59

Reviewer: rev-558 (fresh context, did not author the change). Date: 2026-10-29. Host load1 19-44 throughout; every run below
carries its `/proc/loadavg`.

Summary. The code does what the bead asks. Over 81 scratch trees (the lane's 34 and 47 of mine), the head accepts nothing the
base refused. Every refusal it adds fires before any dist is removed, and every tree both commits accept builds byte-identical
outputs. The real `npm run build` and `npm run build:poc` dists are byte-identical against the base script. The emitted-set
model equals `tsc --listFilesOnly` (247 of 247) and kills the X10 class. All 15 of the lane's mutants are killed by real
assertions. Three things in the PR body are wrong, so the verdict is REVISE, for the body only:
- F1: an inherited `null` `declarationDir` or `outFile` is a newly refused tree that R3 and R4 do not describe;
- F2: R6 is reachable, so the body's "[Inferred] unreachable" and its "E1 is equivalent" are false;
- F3: R1's "any `plugins` key" is broader than the pattern.
Each finding comes with exact replacement text. No code change is required.

## 1. Subject identity

- [Observed] `git diff 7dfad65a 807024b8 | sha256sum` in my scratch clone gives
  `4ebb31a8ad5a7a0590d1b4ed89aed42cc907d1efea7acfa59b43e68a37b6df59`, the same as `sha256sum` of the coordinator's
  `lead/b65/r1-review.diff`. **It matches.** The diff has 13 files, 1,916 insertions and 24 deletions. `git merge-base 7dfad65a 807024b8` is `7dfad65a69e1…`.
- [Observed] `gh pr view 558 -R Tzeusy/syzygy --json body --jq .body | sha256sum` gives
  `388b3aee9ca326d390f25d3e0cb3ddf8ee5592b4f06b6b52ba14e09d91472832`. **The body matches.** `headRefOid` is
  `807024b8739608cac26024e0a964e8da92d1e4b4`, the PR is open, and GitHub reports it `MERGEABLE`.
- [Observed] Hosted checks at that head: `checks	pass	24m23s` and `node	pass	2m57s`.
- [Observed] Main moved during the review: GitHub `main` is `eb6183b5` (PR #555). PR #557 is still `OPEN`. A local merge of
  807024b8 with eb6183b5 (`bbbd2aff`) has no conflicts. It touches no `package*.json`, tsconfig or `vitest.config.ts`.

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at 807024b8):
- :18-20: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- :35-37: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam
  (VIS-7); 4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- :49-51: "**The change record states** which classes the change touches, or "none," so a misclassification is a findable
  violation after the fact. **A reviewer or the owner** may reclassify at any time."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md` at 807024b8):
- :52-53: "'Behavior-preserving' means none of the following changes: a rendered byte, a wire format, a refusal string or an
  exit code;"
- :61-66: "pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security) …
  an old-versus-new differential over a mutated-record corpus …; a rule-6 mutant for each predicate; a non-blocking owner
  notice in the cycle report."
- :95-96, the stop clause: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**Test-rigor bar** (`git show 807024b8:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
- :42: "**A test is worth keeping only if some plausible bug makes it fail.**"
- :60-63, bar 3: "**Edge and failure paths are first-class** — Empty inputs, boundaries, invalid states, error branches …"
- :64-67, bar 4: "**No tautologies** — … Expected values are literals or independently derived."
- :78-79, bar 6: "**Deterministic or quarantined** — A test that fails intermittently is worse than no test".

**AGENTS.md** at 807024b8: verification rules 2, 4, 6, 9 and 10. Two guardrails: "A rule-6 evidence record must store each
mutant's `old`/`new` fragment and the commit it ran at", and "Fresh `git worktree`: run `npm ci` inside it first".

**The bead** (`bd show syzygy-bpyt.65`): items 1-3 as the brief states them. It ends: "Items 1-3 make guards refuse more:
owner notice on syzygy-bpyt.10 at landing. Round 2 N3 (bare TypeError) is on syzygy-bpyt.50."

### Class ruling

**Classes 3 and 4, as the lane reads them. Owner notice on `syzygy-bpyt.10`, once the body lists every new refusal (F1, F2).
No owner question is needed.**

- **Class 3.** [Observed] `scripts/clean_build.mjs` is an exact input of the POC observer gate (`git-observation.ts:180`,
  `exactInputs`). What it refuses decides whether `build:poc` produces the dist the POC serves. The gate's function and its
  input set do not change: `git-observation.ts` is not in the diff. The surface version moves from `polaris@f96e2ec7c279` to
  `polaris@c9315459b6d0` (§3.10). That move comes from the two test files in the app's src tree, not from a decision.
- **Class 4.** [Inferred] Item 1 keeps every suite test, the S10 no-egress proof among them, resolving workspace packages by
  their `source` condition. A plugin could send them to a dist. That is egress-proof integrity, so I accept class 4. No SEC
  surface, auth path or egress path in product code changes: no product module is in the diff.
- **GP-Q0 behavior preservation.** This change is not behavior-preserving in GP-Q0's words. Exit codes change: 0→1 for the
  newly refused trees and 2→1 for the trees that moved before removal. Refusal strings change for those 6 lane trees.
  The body says both, for the trees it lists.
- **Stop clause.** [Observed] Newly accepted: 0 over 81 + 2 + 1 trees (§3.3-3.5). Every change is a refusal of more, or the
  same refusal made earlier with nothing removed. The bead and the coordinator's brief route "refuses more" to a notice on
  `syzygy-bpyt.10`. The notice can only cover refusals it names, and the body omits two (F1) and mis-states the reach of a
  third (F2). Once the body is repaired, nothing remains that the owner has not been told.

## 3. What I ran, and the results

I used one scratch clone of `/home/tze/GitHub/syzygy` under `rev-558/clone`, at `807024b8`, with `npm ci` (exit 0). Node
`v24.6.0`, TypeScript `5.9.3`, Vitest `3.2.7`. Each suite ran under a private TMPDIR (`/tmp/r558-1` … `/tmp/r558-9`, all
deleted). I ran one vitest process at a time and the full suite once. `git status --porcelain` was empty before and after
every mutating run, and `apps/*/dist` and `packages/*/dist` were absent before every vitest run (`ls` count 0).

### 3.1 Scope, by script

[Observed] `git diff --name-status 7dfad65a 807024b8` gives 13 rows, statuses `{'A','M'}`. A Python filter for
`vitest.config`, `package(-lock).json`, `tsconfig`, `.github/`, `PROJECT-STATUS`, `.syzygy/` and `openspec/` matches 0 rows.
0 rows fall outside the three named files and `docs/evidence/syzygy-bpyt-65/`. The code commit `687c5e13` touches exactly
`scripts/clean_build.mjs` and the two test files. `9bec80d5..807024b8` touches only `docs/evidence/syzygy-bpyt-65/`.

### 3.2 The two changed test files

- [Observed] At 807024b8, load 22.39 → 25.90, 40 s: `Test Files  2 passed (2)`, `Tests  29 passed (29)`
  (`sync-child-process-guard.test.ts (6 tests) 239ms`, `product-build.test.ts (23 tests) 35574ms`).
- [Observed] On the local merge with main eb6183b5 (`bbbd2aff`, after `npm ci`), load 28.41 → 26.76, 33 s:
  `Test Files  2 passed (2)`, `Tests  29 passed (29)`.
- [Observed] Test counts, from `vitest list` with each commit's file in place: product-build 15 at 7dfad65a and 23 at
  807024b8; the guard 6 and 6. The body's "15 → 23" and "6 → 6" are true.

### 3.3 Refusal matrix: the lane's 34 trees, re-run

[Observed] `python3 -I docs/evidence/syzygy-bpyt-65/tools/refusal_matrix.py 7dfad65a 687c5e13`, load 19.95: the output equals
the retained `refusal-matrix-7dfad65a-687c5e13.json` once `loadavg` is removed (`equal to recorded: True`).
- `newlyAccepted []`
- `headRefusedAfterRemoval []`
- `newlyRefused`: `r2: inherited declarationDir through extends` and `65: declarationDir outside dist through extends`
- `baseRefusedAfterRemoval`, which equals `messageChanged`: the 6 trees the body names.

### 3.4 Refusal matrix: 47 trees of my own, with a full post-run snapshot

`tools/matrix2.py` runs the lane's 34 cases (taken from the lane tool's own `CASES`) and 47 of mine, base `7dfad65a` against
head `687c5e13`. It snapshots the sha256 of every file in the tree after each run (`node_modules` excluded, the tree root
replaced). Load 19.47 at the start, 21.70 at the end. Results (`matrix2.json`) [Observed]:

| base → head | lane | mine |
|---|---|---|
| accepted → accepted, same | 7 | 19 |
| accepted → refused before removal | 2 | 10 |
| refused after removal → refused before removal | 6 | 12 |
| refused after removal → refused after removal, same | 0 | 2 |
| refused before removal → refused before removal, same | 19 | 4 |

- **Newly accepted: 0 of 81.**
- **Accepted by both: 26.** For each, the base and head snapshots differ in exactly one file, `scripts/clean_build.mjs` (the
  script under test). Every output, `.tsbuildinfo` included, is byte-identical. No accepted tree behaves differently.
- **The head refused after a removal in 2 trees**: `rev: extends a missing file` (`error TS5083: Cannot read file
  '<tree>/packages/a/nope.json'.`) and `rev: extends itself` (`error TS18000: Circularity detected …`). Both are tsc-side,
  identical at the base, and are the recoverable-diagnostic class the body hands to `syzygy-bpyt.73`. No R1-R7 refusal
  fires after a removal.
- The trees the brief asked for, base exit → head exit, head message:
  - `extends` depth 2 ending in `declarationDir: types`: 0 → 1, R3.
  - Depth 3 ending in `outFile` (through `../../b3.json`): 2 → 1, R4.
  - Depth 2 ending in `composite: false`: 2 → 1, R5.
  - An `extends` array: second sets `outFile`, 2 → 1, R4. Composite false then true, 0 → 0. Composite true then false,
    2 → 1, R5. Later entries win, as in TypeScript.
  - `extends` through a package specifier: `cfgpkg/tsconfig.json` with `declarationDir: types`, 0 → 1, R3. A bare `cfgpkg`
    with composite false, 2 → 1, R5. Through `package.json`'s `tsconfig` field with composite true, 0 → 0.
  - A `references` entry: a directory written `./../a`, 0 → 0. A file `../a/tsconfig.json`, 1 → 1, unchanged message
    `not a workspace project with a tsconfig.json`.
  - `composite` true by `extends` and overridden false by the own options: 2 → 1, R5. The reverse: 0 → 0.
  - `declarationDir` relative to the extended file's directory: `packages/a/cfg/deep/b2.json` with `../../dist/types`,
    0 → 0. `packages/base.json` with `types` (so `packages/types`), 0 → 1, R3. `packages/base.json` with `a/dist/types`,
    0 → 0. `${configDir}/dist/types` 0 → 0, and `${configDir}/types` 0 → 1.
  - A symlinked project: a reference through `packages/alias -> packages/a`, 0 → 0. The same with `a` non-composite,
    2 → 1, `packages/alias/tsconfig.json: a referenced project is not composite`.
  - `tsBuildInfoFile` without `incremental` (named `c`, composite removed): 0 → 0, the same outputs.
  - Boundary forms: `declarationDir` exactly `dist`, 0 → 0. `dist-x`, 0 → 1. `dist/../types`, 0 → 1.
  - Duplicate `compilerOptions` members: TypeScript merges them, and `JSON.parse` keeps the last. A first member that
    carries `declarationDir: types` goes 0 → 1, R3. A first member with `outDir: out` and a second with `dist` goes 0 → 0,
    because the last member wins for a scalar.
  - **An inherited `null`**: `declarationDir: null` goes 0 → 1 and `outFile: null` goes 0 → 1, each with
    `Error: packages/a/tsconfig.json: its outputs and incremental state are not both under dist` (F1). `outDir: null` under
    an own `dist` goes 0 → 0. `composite: null` goes 2 → 1, R5.
- [Observed] `ts.getParsedCommandLineOfConfigFile` over a project whose base sets `declarationDir`, `outFile` and
  `composite` to `null` returns `{"declarationDir":"<undefined>","outFile":"<undefined>","composite":true,…} true true`. The
  two trailing values are `'declarationDir' in o` and `'outFile' in o`. TypeScript reads `null` as unset, but the key stays,
  and `clean_build.mjs:44-45` tests the key.

### 3.5 Trying to reach R6 and R7, and one environment case

- [Observed] `tools/r6r7.py` (load about 22). A project directory whose name holds a backslash, `packages/x\y`, with an
  ordinary tsconfig (own `outDir` `dist`):

  | tree | 7dfad65a | 687c5e13 | 687c5e13 with E1 applied |
  |---|---|---|---|
  | A: `packages/x\y` alone | exit 1, `error TS5083: Cannot read file '<tree>/packages/x/y/tsconfig.json'.`, dist removed | exit 1, `Error: packages/x\y/tsconfig.json: its outputs and incremental state are not both under dist`, dist kept | exit 1, TS5083, dist removed |
  | B: beside a nested `packages/x/y` | exit 0, `packages/x\y/dist` removed, tsc built `packages/x/y` | exit 1, the same refusal, dist kept | exit 0, dist removed |

  TypeScript reads the config from the raw path, but it resolves `outDir` through its own normalization, which turns `\`
  into `/`. So the effective `outDir` is `<tree>/packages/x/y/dist`, while `resolve(project, 'dist')` is
  `<tree>/packages/x\y/dist`. Under E1 the tree goes through. **R6 is reachable while the own-options check stands, and
  E1 is not equivalent** (F2). Tree B is also a newly refused tree, under R6.
- [Observed] Sweep: 0 of 7,927 tracked paths (`git ls-files -z`) hold a backslash. A second method,
  `find apps packages -maxdepth 1 -name '*\\*'`, gives 0. So R6 is not reachable in today's tree.
- R7: I did not reach it [Observed for these attempts]:
  - In tree A, TypeScript read the file through its raw path, so no unrecoverable diagnostic fired.
  - A `tsconfig.json` that is a directory is refused earlier: `not plain JSON`, 1 → 1.
  - The R7h mutant (§3.9) survives.
  - I agree with the body's [Inferred] "unreachable today". The only way in I see is a race that changes the file between
    the two reads.
- [Observed] `tools/no_typescript.py`, a tree where `typescript` does not resolve:
  - base: exit 1, `Error: Cannot find module 'typescript/bin/tsc'`, dist removed;
  - head: exit 1, `Error: Cannot find module 'typescript'`, dist kept.

  This changes when the failure happens and what it says (N1).

### 3.6 Effective options over the real tree, and the real builds

- [Observed] `effective_options.mjs` at 807024b8: the rows equal the retained record (`projects` 10, `refused []`).
- That tool's predicate is a copy of the script's (N4), so I swept independently with `tsc -p <p>/tsconfig.json --showConfig`
  over the 10 tracked project tsconfigs [Observed]. Each shows `outDir './dist'`, `tsBuildInfoFile './dist/.tsbuildinfo'`,
  `declarationDir None`, `outFile None` and `composite True`. All 12 tracked `*tsconfig*.json` files hold 0 `null` values.
  **0 of 10 newly refused is true.**
- [Observed] Load 30.74 → 32.55, every dist absent at the start, comparing the head script with `git show
  7dfad65a:scripts/clean_build.mjs` swapped in place (restored afterwards; worktree clean):
  - `npm run build` exit 0 with both scripts: 998 files in 10 dists, combined digest `4d5e8fe8b72be085…` both times. The
    per-file maps are equal.
  - `npm run build:poc` from no dists exit 0 with both scripts: 824 files in 8 dists (the 7 named and
    `polaris-generation-consent` by reference), `0ef66fd50ec00977…` both times. The maps are equal.

### 3.7 The emitted set

- [Observed] `tools/emitted_time.mjs` holds a copy of the new `emitted()`, run twice over the 10 projects:
  - every dist absent (load 34.84): `ms [6361, 4694]`, 247 modules, list sha256 `dffd6137e4d4e7f9…`, `equalsTsc true`
    (`tsc -p … --listFilesOnly`, filtered the same way, 247);
  - every dist present after `npm run build` (load 37.83): `ms [7564, 6062]`, 247, the same `dffd6137e4d4e7f9…`,
    `equalsTsc true`.

  The model is deterministic and does not depend on dist state.
- [Observed] The lane's `emitted_diff.py` re-run at 807024b8 (load 34.93): `vitestExit 0`, clean before and after, and rows
  equal to the retained record. Before 247, after 247, tsc 247, `afterEqualsTsc` 10 of 10, added + dropped = 0.
- [Observed] `tools/model_kinds.mjs` on a scratch project with `allowJs` and `resolveJsonModule`. It holds `j.js`, `m.mjs`,
  `c.cts`, an imported `data.json`, a module named only in `files`, a triple-slash `ref.ts`, and an `unreached.ts` that
  nothing names. The model gives the 7 reached sources, equal to `--listFilesOnly` (`modelEqualsListed true`). `tsc -b` wrote
  exactly one output for each of them (`c.cjs`, `data.json`, `index.js`, `j.js`, `m.mjs`, `only-in-files.js`, `ref.js`).
  It does not miss a JS, MJS, CTS or JSON source, or a `files`-only module.
- [Observed] On a composite scratch project, `tsc -b` with a triple-slash reference to an excluded test file wrote
  `dist/t.test.js` **and** exited 1 with `error TS6307: File '…/t.test.ts' is not listed within the file list of project`.
  So under `composite` the build itself also fails on X10 (N7).
- `beforeAll` 120 s: the computation took 4.7-8.1 s at load 35-44, a margin of about 15×, and builds no scratch tree.
  It is deterministic (above).

### 3.8 The plugins pattern

[Observed] `tools/plugins_probe.mjs` reads `PLUGINS_KEY` from the guard file (`\bplugins\b['"]?\s*:`) and tests forms.
- **Refused**: bare, single-quoted, double-quoted, a space before the colon, a newline before the colon, and the text
  `// no plugins: none here` inside a comment.
- **Not refused**:
  - the shorthand, alone and among other keys;
  - a computed key `['plugins']:`, `["plugins"]:` or `` [`plugins`]: ``;
  - a comment between the key and its colon;
  - `plugins:`, a Unicode escape in an identifier, which JavaScript accepts;
  - a spread of an imported object;
  - `mergeConfig` with an imported config;
  - a project entry `extends: './vite.plugins.config.ts'`.
- **False positives**: `pluginsX:` and `myplugins:` are not refused. Matches in `vitest.config.ts` at 807024b8: **0**. At
  main eb6183b5: **0**.
- [Observed] I set the POC app project's `extends: true` to `extends: './vitest.r558-plugins.config.ts'` and added that file
  with `plugins: [{ name: 'r558-probe', resolveId: () => null }]`. `sync-child-process-guard.test.ts` then gave
  `Tests  6 passed (6)` (load 29.45). Both files were restored and removed.

  Vitest 3.2.7 types the project field as `extends?: string | true` ("Relative path to the extendable config",
  `node_modules/vitest/dist/chunks/reporters.d.BuRON0I0.d.ts:2366-2370`). A plugin can therefore enter one project from
  another file, and that project also leaves the root `ssr.resolve.conditions`. This predates the PR (N3).
- **Ruling on the shorthand.** Not refusing `{ plugins }` is acceptable as a deliberate, disclosed limit of a text check. It
  needs a `plugins` binding in the same file. It matches `ALIAS_KEY`'s shorthand gap, which `syzygy-bpyt.70` item 8 already
  tracks (its 2026-10-28 12:06 comment). A computed key, a comment between key and colon, and an `extends` path are the same
  kind of limit, but the body's R1 sentence claims "any `plugins` key" (F3).

### 3.9 Rule 6

**The lane's 15 mutants.** [Observed] `mutants.py` run at 807024b8, clean before and after, load 25.82 → 39.03, 581 s. The
unmutated runs were the guard `0 6 0` and build `0 23 0` (exit, passed, failed). **15 of 15 killed.** I read each kill's
failing assertion. None is a timeout:
- X9s, X9d, X9r, X9q: `Error: vitest.config.ts: a plugin may load a workspace package by other than its source condition`
  in the real-config row.
- P1: the config row, `AssertionError: ssr: { resolve: …` (a new case did not throw the plugin message).
- X10 and X10b: `the product build emits no test and no test-support module …`, `expected [ …(3) ] to deeply equal [ …(2) ]`.
- P2: the triple-slash row, `expected [ 'packages/a/src/a.ts' ] to deeply equal [ 'packages/a/src/a.ts', …(1) ]`.
- C1 and C6: `promise resolved "{ stdout: '', stderr: '' }" instead of rejecting`.
- C2, C3 (its three rows) and C4: `to match object { stderr: StringContaining{…} }`.
- C5 and C7: the acceptance rows' `Command failed: …clean_build.mjs pack…`.
- C6a: `0 23 0`, survives as the body says.

**C6a.** I rule it a defence, not a gap. With only the own `outDir` check dropped, the effective check refuses the same row
(C6 kills when both are dropped).

**E1.** Not equivalent (§3.5). Run as my mutant E1: `0 23 0`, it survives every row. It is an unpinned predicate that the
body calls equivalent (F2).

**My own mutants.** [Observed] `tools/mutants2.py` at 807024b8, clean before and after, load 28-38, 377 s:

| id | mutation | result | failing assertion |
|---|---|---|---|
| O1 | the non-composite check moves after `rmSync` | killed, 3 | the three R5 rows: `ENOENT: no such file or directory, open '…/packages/a/dist/a.js'` (the kept output is gone) |
| O2 | the effective outputs check is deferred until after `rmSync` | killed, 2 | both `through extends` rows: `ENOENT … packages/a/dist/a.js` |
| MF1 | the model keeps only the files the tsconfig names | killed, 1 | the triple-slash row |
| MF2 | the model keeps `.d.ts` files | **survives** | none (0 tracked `.d.ts` files: `git ls-files '*.d.ts'` is empty) |
| MF3 | the model widens from `<project>/src/` to `<project>/` | **survives** | none (`include: ['src']` is pinned by the first product row) |
| PK1 | `PLUGINS_KEY` loses the quote class | killed, 1 | the config row, `AssertionError: 'plugins': [],` |
| PK2 | the plugins check moves after the project count | killed, 1 | the config row (the single-quoted case now throws the count message): round 3's N1 ordering is pinned |
| C9 | `underDist` loses its exact-`dist` arm | killed, 13 | every acceptance and refusal row that reaches the effective check |
| C10 | `underDist` loses the `/` (so `dist-x` passes) | **survives** | none (N2) |
| E1 | the lane's E1 | **survives** | none (F2) |
| R7h | the unrecoverable-diagnostic handler stops throwing | survives | none (R7 unreachable, §3.5) |

O1 and O2 are the two ordering mutants: moving a refusal after the first removal is caught by the rows' kept-output check.

**Proposed rows, tried.** [Observed] `tools/fix_row_probe.py` adds the R6 row and the `dist-x` row given in F2 and N2 and runs
product-build three ways:
- unmutated: `0 25 0`;
- under E1: `1 24 1`, the backslash row failing with `to match object { stderr: StringContaining{…} }`;
- under C10: `1 24 1`, the `dist-x` row failing with `promise resolved … instead of rejecting`.

A first try placed the backslash case inside the `it.each` with `KEPT_OUTSIDE`. Under E1 it also failed the next row with
`ENOENT … packages/x\y/dist/m.js`, because `KEPT_OUTSIDE.splice(0)` never ran after the failed `rejects` (N6). The rows in F2
avoid that.

### 3.10 The observer gate and the surface version

- [Observed] `git diff 7dfad65a 807024b8 -- apps/three-surface-poc/src/git-observation.ts` is empty. `exactInputs` still
  names `scripts/clean_build.mjs` (`git-observation.ts:180`), so the gate's decisions do not change: an uncommitted edit to
  the script is refused, as before.
- [Observed] `pwbSurfaceVersion` recomputed from `git rev-parse <c>:<tree>` for the two `POLARIS_SURFACE_TREES` gives:
  - `7dfad65a polaris@f96e2ec7c279`
  - `687c5e13 polaris@c9315459b6d0`
  - `9bec80d5 polaris@c9315459b6d0`
  - `807024b8 polaris@c9315459b6d0`
  - `eb6183b5 polaris@7c47d0dcf42b` (current main)
  - the local merge `bbbd2aff polaris@857cfca7683c`

  The body's two figures are right (N5).

### 3.11 Full suite, typecheck, governance

- [Observed] `npx vitest run` at 807024b8, every dist absent, load 29.88 → 39.36, 359 s, exit 1:
  `Test Files  1 failed | 252 passed | 3 skipped (256)`, `Tests  1 failed | 5790 passed | 5 skipped (5796)`. The failure:
  `FAIL |@syzygy/polaris-dossier| packages/polaris-dossier/src/start-gates.test.ts > init: the clone holds the consented
  commit alone (syzygy-qkea.24) > refuses config naming a remote, a promisor, an include or a command the agent's git would
  run (R-POLARIS-DOSSIER-CLONE-SHAPE-2 finding 1)`, `Error: Test timed out in 5000ms.`
  - Re-run alone, with the default timeout (load 34.32 → 30.95, 48 s): `Test Files  1 passed (1)`,
    `Tests  104 passed (104)`. It passes alone. It is the same file the lane saw time out, at a different test, and this
    change does not touch it. No dist was created by either run.
- [Observed] `npm run typecheck` exit 0, 18 s.
- [Observed] `python3 scripts/check_governance.py` exit 0: `32 OK, 21 WARN, 0 FAIL (53 checks)`.
  `python3 scripts/check_quotations.py` exit 0.
- [Unknown] I did not re-run the canonical battery. The body's `commands=114, nonzero=0` is not re-derived here. Hosted
  `checks` passed at 807024b8.

## 4. Findings

### F1 — An inherited `null` `declarationDir` or `outFile` is a newly refused tree that R3 and R4 do not describe (low, blocking: a refusal the body does not list)

**Evidence.**
- [Observed] §3.4: `rev: inherited declarationDir null` and `rev: inherited outFile null` each go from base exit 0 (built, every
  output under dist) to head exit 1, `Error: packages/a/tsconfig.json: its outputs and incremental state are not both under
  dist`, with nothing removed.
- TypeScript reads an inherited `null` as unset, so the effective `declarationDir` and `outFile` are `undefined`. The key
  stays, and `clean_build.mjs:44-45` tests it: `'declarationDir' in effective && !underDist(effective.declarationDir)` and
  `'outFile' in effective`.
- The body's R3 is "An effective `declarationDir` outside `<project>/dist`". An unset one is not outside. R4 says "Before
  this change, tsc refused it with exit 2, after the dists were removed", but for this tree the base built and exited 0.
- The script header (`clean_build.mjs:8-9`) has the same gap for `declarationDir`: "refuses an `outDir`, `tsBuildInfoFile` or
  `declarationDir` outside the project's dist". It does not have it for "any `outFile`".
- [Observed] It is not reachable today: 0 `null` values in the 12 tracked `*tsconfig*.json` files. The own-options check has
  refused an own `"outFile": null` since #549 (`r2: outFile null`, 1 → 1), so the head is consistent with it.

**Failure scenario.** Someone clears an inherited option in a shared base with `"declarationDir": null`, which is
TypeScript's way to unset it. The clean build refuses, saying the outputs are not under dist, though they all are. The
owner notice on `syzygy-bpyt.10`, copied from R1-R7, never told the owner that this tree is refused.

**Exact fix (PR body, no code change).**
- At the end of the R3 bullet, after "(exit 0).", add:

  > It also fires on a `declarationDir` inherited as `null`, which TypeScript reads as unset: the parsed options keep the key with the value `undefined`, and the check tests the key. Before this change that tree built with every output under dist (exit 0). The own-options check has refused an own `"declarationDir": null` since #549.

- At the end of the R4 bullet, after "after the dists were removed.", add:

  > An `outFile` inherited as `null`, which TypeScript reads as unset, is refused the same way, because the check tests the key; before this change that tree built (exit 0). The own-options check has refused an own `"outFile": null` since #549.

- In "Nothing new is accepted", after the first bullet's sub-list, add:

  > - Review round 1 (`R-GP-IMPL-EFFECTIVE-OPTIONS-1`) ran 47 more trees and two backslash trees. Newly accepted: 0. Newly refused: 8 more under R3, the two inherited-`null` trees under R3 and R4, and one backslash tree under R6.

  (Optional, a follow-up: add "or set it to `null`" to the header's sentence on line 8. If the coordinator would rather
  accept these trees, replace `'declarationDir' in effective &&` with `effective.declarationDir !== undefined &&` and
  `'outFile' in effective` with `effective.outFile !== undefined`, and pin it with a row. Against the base this accepts
  nothing new, but it is a code change, and the effective check would then disagree with the own check.)

### F2 — R6 is reachable, and E1 is not equivalent; the body says the opposite of both (low, blocking: a false sentence in the PR body)

**Evidence.**
- [Observed] §3.5: a project directory named `packages/x\y` reaches R6, alone (base: removed, then TS5083, exit 1) and beside
  a nested `packages/x/y` (base: removed its dist and built the other project, exit 0). The head refuses both before removing
  anything. With E1 applied, the head behaves as the base.
- The body's R6 says "[Inferred] It is unreachable while the own-options check stands, which requires the tsconfig's own
  `outDir` to be `dist` and its own `tsBuildInfoFile` to be `dist/.tsbuildinfo`." The reasoning misses that the own check
  compares literal strings while the effective check compares paths, and TypeScript resolves a path differently from Node's
  `resolve` (`\` becomes `/`).
- The body's E1 says "It is equivalent while the own-options check stands, for the reason given at R6, and is not run".
  `mutants-9bec80d5.json`'s `equivalent[0].reason` says the same.
- [Observed] Not reachable today: 0 of 7,927 tracked paths hold a backslash.

**Failure scenario.** A later change deletes the effective `outDir`/`tsBuildInfoFile` arm on the strength of the body's
"equivalent", and nothing fails, because no row pins it. The refusal of trees like B is lost silently.

**Exact fix (PR body).**
- In R6, replace "[Inferred] It is unreachable while the own-options check stands, which requires the tsconfig's own `outDir` to be `dist` and its own `tsBuildInfoFile` to be `dist/.tsbuildinfo`. A tsconfig's own option overrides an inherited one. See E1 below." with:

  > It is reachable while the own-options check stands, because that check compares the literal strings `dist` and `dist/.tsbuildinfo`, while this one compares the paths TypeScript resolves, and TypeScript reads a backslash in a path as a separator. [Observed by review round 1] A project directory named `packages/x\y` reaches it. Alone, the base removed its dist and then failed in tsc with TS5083 (exit 1). Beside a nested `packages/x/y` project, the base removed its dist and built the other project (exit 0). The head refuses both before removing anything. No tracked path holds a backslash today (0 of 7,927).

- Replace the E1 bullet with:

  > - **E1** drops only the effective `outDir` and `tsBuildInfoFile` refusals. It is not equivalent: the backslash trees at R6 tell it from the head. It survives every row (review round 1: 23 of 23 pass under it), so this predicate is not pinned by a test. `mutants-9bec80d5.json` records it under `equivalent`, with a reason that review round 1 falsifies.

- Optional hardening, in this PR or a follow-up: insert this row in `product-build.test.ts` after the `it.each` block, before
  `// tsc -b requires composite only of a referenced project`. Then move E1 from `EQUIVALENT` into `MUTANTS` in `mutants.py`
  and regenerate the record. I tried it (§3.9): it passes at the head and kills E1.

  ```ts
  // TypeScript reads a backslash in a path as a separator, so it resolves this project's outDir to packages/x/y/dist, outside its
  // own dist, while the tsconfig's own outDir is 'dist' (R6).
  it('refuses, removing nothing, when it names a project whose directory name holds a backslash', async () => {
    const root = scratchTree();
    plant(root, 'packages/x\\y/src/m.ts', "export const m = 'm';\n");
    plant(root, 'packages/x\\y/tsconfig.json', readFileSync(join(root, 'packages/c/tsconfig.json'), 'utf8'));
    plant(root, 'packages/x\\y/dist/m.js', 'kept\n');
    await expect(cleanBuild(root, 'packages/x\\y')).rejects
      .toMatchObject({ stderr: expect.stringContaining('packages/x\\y/tsconfig.json: its outputs and incremental state are not both under dist') });
    expect(readFileSync(join(root, 'packages/x\\y/dist/m.js'), 'utf8')).toBe('kept\n');
  }, 30_000);
  ```

### F3 — R1 says the guard fails on "any `plugins` key"; the pattern sees only some spellings (low, blocking: a false sentence in the PR body)

**Evidence.**
- [Observed] §3.8: `\bplugins\b['"]?\s*:` does not refuse a computed key (`['plugins']:`), a comment between the key and its
  colon, or a Unicode-escaped identifier. Each of these is a `plugins` key in JavaScript.
- It also does not see a spread or `mergeConfig` of a config from another module, or a project entry whose `extends` names
  another config file. That last case passed the guard 6 of 6.
- The body's §1 discloses only the shorthand.
- This is the class of the PR 549 round-2 F2 that this bead follows up: a guard sentence broader than its check.
- [Observed] None of these forms is in `vitest.config.ts` today (0 matches, and the file has no computed key or `extends`
  path).

**Failure scenario.** A reader of the owner notice takes R1 as total and does not look for the `extends`-path route, which is
an ordinary Vitest pattern.

**Exact fix (PR body).** Replace the R1 bullet with:

> - **R1.** `sync-child-process-guard.test.ts` fails on a `plugins` key in `vitest.config.ts` written bare (`plugins:`) or quoted (`'plugins':`, `"plugins":`), with any whitespace before the colon, at the root or in a project entry, and on that text inside a comment. It does not see the shorthand `{ plugins }`, a computed key (`['plugins']:`), a comment between the key and its colon, a spread or `mergeConfig` of a config from another module, or a project entry whose `extends` names another config file; none of these is in `vitest.config.ts` today.

### N1 — A missing `typescript` now fails before removal, with a different message (note)

[Observed] §3.5:
- base: exit 1, `Error: Cannot find module 'typescript/bin/tsc'`, after removing the dists;
- head: exit 1, `Error: Cannot find module 'typescript'`, nothing removed. `clean_build.mjs:22` now loads `typescript`
  before the visit.

This concerns the install, not a tree, and it is an improvement. It is still a changed refusal string and ordering that the
body does not list. Fix (optional, same body repair): add to §3 "Effective options in `clean_build.mjs`":

> Because the script now loads TypeScript before the visit, a checkout where `typescript` does not resolve fails before anything is removed (`Cannot find module 'typescript'`, exit 1), where the base removed the dists first and then failed (`Cannot find module 'typescript/bin/tsc'`, exit 1).

### N2 — Two predicates the new code relies on are not pinned by any row (note)

[Observed] §3.9:
- **C10**: the `/` in `underDist`'s `startsWith(`${dist}/`)` survives. Without it, `declarationDir: 'dist-x'` would be
  accepted, and declarations would land beside dist. The head refuses it (§3.4).
- **MF2** (the model's `.d.ts` exclusion) and **MF3** (its `src/` prefix) survive. Both are equivalent on today's tree.

Fix (follow-up bead): add this row to the `it.each` list after `'reaches a referenced project that inherits composite false'`.
I tried it: it passes at the head and kills C10.

```ts
    ['reaches a project whose declarations sit in a sibling of dist through extends', ['packages/d'], (root) => inherit(root, 'packages/a', { declarationDir: 'dist-x' }),
      'packages/a/tsconfig.json: its outputs and incremental state are not both under dist'],
```

MF2 and MF3 need no row while no tracked `.d.ts` exists and the first product row pins `include: ['src']`.

### N3 — A project entry's `extends` path and a string project entry escape the guard; this predates the PR (note)

[Observed] §3.8: `extends: './vitest.r558-plugins.config.ts'` in the app's entry passed the guard 6 of 6. That project then
also drops the root `ssr.resolve.conditions`, which `SOURCE_CONDITION` checks only as text at the root.
- `TestProjectConfiguration` also admits a string entry, a path to a config file.
- [Inferred from `suiteConfig` at `sync-child-process-guard.test.ts:65-78`] Such an entry adds no `name` and no `include`,
  so the counts still agree and it passes.

Fix (follow-up bead, its own GP-Q0 notice): refuse any `extends` value other than `true` and any project entry that is not an
object literal, with the X9 route through another file as its mutant.

### N4 — `effective_options.mjs` restates the script's predicate (note)

The record's `refused: []` is computed by a copy of `clean_build.mjs`'s own check (bar 4, "independently derived"). The figure
stands: my `tsc --showConfig` sweep (§3.6) agrees 10 of 10, and the real builds pass. Fix: none in this PR. A future record of
this kind should derive its verdict from `--showConfig` or from `tsc -b --dry` output.

### N5 — The landing will show a third surface version (note)

[Observed] Main `eb6183b5` is `polaris@7c47d0dcf42b`, and my local merge is `polaris@857cfca7683c`. [Inferred] A landing
merge with the same trees gives the same version. The dispositions record should name the version at the landing commit, as
#549's N4 did.

### N6 — A failed `rejects` in the refusal `it.each` leaks `KEPT_OUTSIDE` into the next row (note)

[Observed] §3.9, first try: when one row's `rejects` assertion fails, `KEPT_OUTSIDE.splice(0)` never runs. The next row then
fails on that leftover path (`ENOENT … packages/x\y/dist/m.js`) and reports a misleading second failure. In the shipped list,
the next row after the `outside` case is now this PR's `… through extends` row. Fix (follow-up): clear `KEPT_OUTSIDE` at the
start of each case, or in `afterEach`, with `KEPT_OUTSIDE.length = 0`.

### N7 — Under `composite`, an X10 reference also fails the build (note)

[Observed] §3.7: `tsc -b` emits `t.test.js` and exits 1 with TS6307, so `npm run build` would also fail. The header comment of
`product-build.test.ts` ("TypeScript emits every module … whatever `exclude` says") is true, since it does emit. The emit row
is the named, early catch. No fix needed. Optionally, add "(a composite build also fails, TS6307)" to that comment.

### N8 — A full-suite timeout recurred in `start-gates.test.ts` (note)

[Observed] It hit a different test than the lane's, timed out at 5000 ms under load 30-39, and passed 104 of 104 alone. It is
unrelated to this diff. If no bead tracks `start-gates.test.ts` timeouts under load, file one.

## 5. Every changed gate or script decision

- **`scripts/clean_build.mjs`.** [Observed] Over 81 + 2 + 1 trees (§3.3-3.5):
  - newly accepted 0;
  - newly refused before removal: 12 by exit status in the matrix (10 under R3, 2 inherited-`null` under F1), plus tree B
    under R6;
  - moved from "refused in tsc after removal" to "refused by the script before removal": 18 in the matrix (6 lane trees
    under R4/R5, 12 of mine under R3/R4/R5), plus tree A under R6 (TS5083 → R6 message);
  - unchanged: 23 refused trees with the same exit and message, 2 tsc-side refusals after removal (`syzygy-bpyt.73`), and 26
    accepted trees with byte-identical outputs.

  Outside trees, a missing `typescript` now fails before removal (N1). Nothing else changes: the real builds' dists are
  byte-identical (§3.6).
- **`product-build.test.ts` emit rows.** [Observed] They decide the same on today's tree: old against new adds 0 and drops 0,
  and new equals tsc for 247 modules. They newly fail on a triple-slash reference to test support (R2, X10, X10b).
- **`sync-child-process-guard.test.ts`.** [Observed] R1 as in F3's replacement text. Today's config: 0 matches, also at main.
- **POC observer gate.** [Observed] No decision changes (§3.10). Only the surface version moves, as recorded.
- Beyond these: none. [Observed] The diff's other 10 files are evidence under `docs/evidence/syzygy-bpyt-65/`, which no gate or
  script reads. `grep -rF syzygy-bpyt-65` finds no reader under `scripts/`, `apps/` or `packages/` (0 hits).

## 6. Verdict on each bead item

1. **The plugins key.** Done. The pattern is a superset of the bead's `/\bplugins\s*:/` (quoted keys too). It is checked
   first (PK2 kills), and X9 is its mutant (X9s/X9d/X9r/X9q killed with the new message). The body sentence is to be
   repaired (F3).
2. **The emitted set from TypeScript's program.** Done, with `projectReferences` added to the bead's call. It equals tsc on
   10 of 10 projects and handles every source kind I tried (§3.7). X10 is its mutant (killed), and P2/MF1 kill a regression
   of the model.
3. **Effective options in `clean_build.mjs`.** Done. Every listed refusal fires before removal (O1 and O2 kill an ordering
   regression). Nothing is newly accepted, and all 10 real projects pass. The body must list the inherited-`null` refusal
   (F1) and correct R6/E1 (F2).

## 7. Test quality

- **The new rows.** Each new refusal row asserts both the refusal text and that every kept output survives. That pair is
  what kills the ordering mutants O1 and O2 (bar 3, failure paths).
- **The acceptance rows.** These pin the two trees a careless R5 would break (C5 and C7 kill).
- **The triple-slash row.** It checks the model against an independent oracle, `tsc --listFilesOnly`, with literal expected
  arrays, before and after the reference (bar 4).
- **Durations.** Under the full-suite load (load1 about 38), the refusal rows took 0.6-1.2 s against a 30 s timeout, the
  acceptance rows 6.2 s and 10.9 s against 60 s, and the triple-slash row 8.1 s against 60 s. The `beforeAll` took 4.7-8.1 s
  against 120 s. These are adequate margins.
- **Determinism.** The model is deterministic across dist states (§3.7). Each scratch tree comes from `mkdtemp` and is
  removed in `afterEach`.
- **Gaps.** Two predicates are unpinned: E1 (F2) and C10 (N2), each with a tried row. There is also the `KEPT_OUTSIDE` leak
  on failure (N6).
- **Failure messages.** They are readable: `stringContaining(reason)` and `readFileSync(path, 'utf8'), path` name the case.
  The guard's config row passes the config text as the assertion message.

## 8. Cleanup

Deleted:
- the scratch clone `rev-558/clone`;
- the TMPDIRs `/tmp/r558-1` through `/tmp/r558-9`;
- the logs (the full suite, the targeted runs, the builds, governance, quotations, typecheck and `npm ci`);
- the PR body copy and the `.load`, `.done` and `.err` files.

Nothing outside my own paths was touched. Kept, under `rev-558/`:

| Path (relative to `rev-558/`) | sha256 |
|---|---|
| `emitted-diff-lane.json` | `a070aeae413faf1a88ee2dcec536b669309282ae57144a56c0c86d32158e7697` |
| `emitted-time-dists.json` | `66152b4ad197cde0e31f14329e7818f5b48f15323211ee8a73b20e03f8dab618` |
| `emitted-time.json` | `cf20116dd528e35c0ad8ed8931c94e8e24455a5c602885c61125d0bb9d7e3588` |
| `fix-row-probe.json` | `80c114784886a875e5d9824ea6d6a71fcff0b5991c7fee3866d617de73dd59e8` |
| `matrix-lane.json` | `a2fd36f13f250a035154c990c6892d60ec41e8e913f35d5284d34aac26a64dff` |
| `matrix2.json` | `91d6a7384d0b450261ba62153ef1681605b9a4c66331315dc7c861269bbdc91a` |
| `model-kinds.json` | `239b36858b978116c38e59c151a89c595134d34310a2fde64f4e21c2288b87ec` |
| `mutants-lane.json` | `75e4c0722b06039a8b30ddba432dda53b18ca983654155b74cda926adbe6c629` |
| `mutants-mine.json` | `7fd9ea32b94f41e87dc68e99dcf9110b2a74f8dc14c33814eb501a0467edd03a` |
| `no-typescript.json` | `c1759976ca34aa7eac7e09bb5dbacde305c974cf6e978412a272cb4126e576fd` |
| `plugins-probe.json` | `2d95da9e64cf03aae0e603d8db7cbb3e462f1e648d7be5288b97f3c2c47ebe54` |
| `r6r7.json` | `f5b726b25a2e743863a4cca41a2680f7cbb0bf22d5af4fdb8b32d5f39d9eb649` |
| `tools/dist_hash.py` | `5bb9115f9d71a831dd61baa7a5cef3e60b033f29ae39d9d622a550f1077d7d30` |
| `tools/emitted_time.mjs` | `94799b9234ae2ce08257afe7640febca3741a95e4b195716c32c531408f46374` |
| `tools/fix_row_probe.py` | `7921c552383d967209e3b477cae3d102106defd10d90410f358f70bb2c4a0e62` |
| `tools/matrix2.py` | `c95f16cfcf7d15f1552abffbf2572293ffcff811afb6ca8127464a36f58350e0` |
| `tools/model_kinds.mjs` | `5374ac538059fc0be4c0190ef90c4e5681037f786eec526d71e8043cb96f9167` |
| `tools/mutants2.py` | `e8c5e5fd4d9c87121eeaf009a777372db64ecace210d72bfb1c7d7390c4fb2d2` |
| `tools/no_typescript.py` | `d10ee609457b3414e3287f75d76c30acbe7722568bcffcc8b3c55cc830540de3` |
| `tools/plugins_probe.mjs` | `fb3e4468255fcf1f33510c767b9d3f4725cc7a7b754ef505136cb5c080b28e55` |
| `tools/r6r7.py` | `17649b5eba3625f087c37bf228a70c9369901f7d4e1013c38fc9eb42606a84b4` |

Each file is under 300 KB (the largest, `matrix2.json`, is 64,684 bytes). No retained JSON has a key named `source`, `provenance`, `evidence` or `anchor`.
