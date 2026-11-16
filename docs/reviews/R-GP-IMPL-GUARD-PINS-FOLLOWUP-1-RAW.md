# R-GP-IMPL-GUARD-PINS-FOLLOWUP-1 — CC-REV-1 implementation review of syzygy-bpyt.8.38, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: c1227667
Subject: r1-review.diff sha256 916b42679b39f9ee2c74fb90585d6f9d4fd82d0b62c5088d748943170be6f50a

Reviewer: fresh-context CC-REV-1 reviewer (rev-536). I did not author the change. I read the brief, the bead (read-only), the PR body, the PR #531 raw and its dispositions, the governing references at `c1227667`, and the lane's evidence at `c1227667`. I edited no repository worktree, pushed nothing, commented nowhere and ran no `bd` mutation. Every run was in my own scratch clones, now deleted.

## 1. Subject identity checks

- [Observed] `sha256sum` of the subject file `r1-review.diff`: `916b42679b39f9ee2c74fb90585d6f9d4fd82d0b62c5088d748943170be6f50a`. **Matches.**
- [Observed] In a fresh clone (`git clone /home/tze/GitHub/syzygy`, then `git fetch https://github.com/Tzeusy/syzygy.git` of `agent/syzygy-bpyt.8.38` and `main`):
  - `git rev-parse` of the branch: `c12276679a8ed4d3b6b9642215115b77dbfc49d4`; the PR's `headRefOid` is the same.
  - `git merge-base` of the branch and `main` (`f7477f52c49ee347f96b92703887c31f6be49e07`): `e5080f4dcdcc208127ae5dc0b915acf413df9764`. **Matches the brief's base.**
  - `git diff e5080f4d c1227667 | sha256sum`: `916b42679b39f9ee2c74fb90585d6f9d4fd82d0b62c5088d748943170be6f50a`, and `cmp` with the subject file: `SAME`. Shortstat: `21 files changed, 4394 insertions(+), 6 deletions(-)`. **Matches.**
  - `git diff e5080f4d 831f40c1 | sha256sum`: `37718512521253cbf50178a4dd0290cf1205f6214fd9875c45084eeefcf5ac8b`. Shortstat: `3 files changed, 28 insertions(+), 6 deletions(-)`. **Matches.**
  - `831f40c1^` is `e5080f4d` and `c1227667^` is `831f40c1`. The evidence commit adds 18 files, all under `docs/evidence/syzygy-bpyt-8-38/` (`tools/check_record.py`, result `check-record.json`).
- [Observed] Code commit paths: `packages/polaris-dossier/src/argv.test.ts`, `packages/polaris-generation-core/src/workspace-reach.test.ts`, `packages/polaris-generation-core/src/workspace-reach.testkit.ts`. No `package.json` and no path under `.syzygy/**` or `openspec/**` is in the subject (0 of 21 paths).
- **Main has moved.** [Observed]
  - `git diff --name-only e5080f4d f7477f52`: 248 paths, 167 under `docs/` and 81 outside it (full list: `main-changed-paths.txt`). Outside `docs/` they are `AGENTS.md`, `package.json`, `package-lock.json`, `vitest.config.ts`, the new workspace package `packages/support/**` (its `package.json`, `tsconfig.json` and six `src` files), five changed workspace manifests (`apps/three-surface-poc`, `packages/polaris-dossier`, `packages/polaris-generation-consent`, `packages/polaris-generation-core`, `packages/three-surface-poc-core`) and their `tsconfig.json`, and product sources under `apps/three-surface-poc/src/**`, `packages/polaris-dossier/src/**`, `packages/polaris-generation-consent/src/**`, `packages/polaris-generation-core/src/**` and `packages/three-surface-poc-core/src/**`. One of those is `apps/three-surface-poc/src/polaris-generation/self-corpus.ts` (+1/−2), the file the new depth row names; it still exists at `f7477f52`.
  - **Overlap with the subject: 0 of 21 subject paths** (`comm -12` of the two sorted path lists is empty).
  - `git merge-tree --write-tree f7477f52 c1227667` exits 0 with tree `55c93a573359b334709b852e70448db1acbe495c`. I made a local merge commit `c117df159f272791c58609734370d98524175d6e` of `c1227667` with `f7477f52`; its tree is that same `55c93a57`. I ran `npm ci` in it (`added 117 packages`; `node_modules/@syzygy/support` is linked) before any run there.

## 2. Clauses relied on (quoted), and the class ruling

Quoted at `c1227667`:
- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
  - `:31-32` "1. **authority boundaries** — write-universe, typed-authority table," / "adapter authorization (VIS-5, VIS-6);"
  - `:37` "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - `:40-41` "6. **public interface** — machine-queryable endpoints, adapter contracts," / "anything an external consumer can depend on;"
  - `:45` "**Class membership is contested by default and is never finally determined"
  - `:49` "- **The change record states** which classes the change touches, or "none,""
  - `:51` "- **A reviewer or the owner** may reclassify at any time."
- GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
  - `:52-53` "- "Behavior-preserving" means none of the following changes:" / "- a rendered byte, a wire format, a refusal string or an exit code;"
  - `:62` "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security), and class-6 pull requests that remove an endpoint."
  - `:64-66` "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;" / "a rule-6 mutant for each predicate;" / "a non-blocking owner notice in the cycle report."
  - The stop clause, `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns" / "to the owner."
- `AGENTS.md`: rule 2 `:120` "No "zero / all / 100%" claim without running that exact sweep this"; rule 4 `:123` "Read a check's output, not its exit code, and check its denominator"; rule 6 `:126` "Mutate the input and confirm the check fails, per predicate, before"; rule 7 `:128` "Run the battery in a clone before calling it green; the report is valid"; rule 9 `:132` "A claim of absence needs a sweep with a denominator."; rule 11 `:134` "An evidence record names its subject and the subject's digest; a record"; guardrail `:263` "A rule-6 evidence record must store each mutant's `old`/`new` fragment and".
- The test-rigor bar, by `git show c1227667:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`:
  - bar 1, `:52` "1. **Assert behavior, not implementation** — Tests pin observable outcomes"
  - bar 3, `:60` "3. **Edge and failure paths are first-class** — Empty inputs, boundaries,"
  - bar 4, `:64-67` "4. **No tautologies** — A test that mirrors the implementation's logic to" / "compute its expected value, or that asserts a mock returned what the mock" / "was told to return, verifies nothing. Expected values are literals or" / "independently derived."
  - bar 6, `:78-79` "6. **Deterministic or quarantined** — A test that fails intermittently is" / "worse than no test: it trains people to ignore red. Fix the"
  - bar 8, `:85` "8. **Tests are maintained code** — Duplication, dead fixtures, and"
  - bar 10, `:93-94` "10. **Growth is governed** — A test is worth *adding* only if it catches a" / "plausible bug no existing test catches: search for the nearest existing"
- The precedent, `docs/reviews/R-GP-IMPL-GUARD-PINS-1-RAW.md` §2 (PR #531), which I re-read: "I read GP-Q0 `:95-96` as the #524 and #528 rulings did: it covers what a product gate accepts or refuses, and this change moves no product byte."

**Class ruling: classes 1, 4 and 6, with no endpoint removed. Classes 2, 3, 5 and 7 are not touched.** The PR declares 1, 4 and 6, and I agree.
- **Classes 1 and 4.** [Observed] `island-boundary.test.ts:3` imports `reach` from `workspace-reach.testkit.js`, and `subpath-imports.test.ts:6` imports `reach`; the testkit's resolver is the mechanism of the island guard. [Inferred, from the #531 and #528 rulings] That guard is the rule-6 kill evidence for the 8.1 ruling's class-1 and class-4 claims. This change adds rows that pin that mechanism. It moves no token of it: [Observed] the testkit's JavaScript, emitted by TypeScript with `removeComments`, is identical at base, head and the local merge (`{"emitEqual":true,"emitBytes":[4559,4559]}`), and a one-character mutant of the pattern line makes it differ (`{"emitEqual":false,"emitBytes":[4559,4558]}`). Under `:45` I keep the conservative reading: a change to the evidence of a class-1/4 claim touches those classes.
- **Class 6, no endpoint removed.** [Observed] The census rows pin the `./argv` export of `@syzygy/polaris-dossier`. No manifest is in the subject (0 of 12 at `c1227667`), and `@syzygy/polaris-generation-core` exports only `.` and `./live`, so nothing an external consumer depends on moves.
- **GP-Q0's three checks apply (classes 1 and 4).**
  - Differential: degenerate for the product, since no product byte changes. The stand-in (old testkit against new over one tree) is non-degenerate and reproduced at both trees (§3.8), and its selftest and my own variant fail as they should.
  - A rule-6 mutant per predicate: met for the bead's nine targets and the lane's four own mutants (§3.2, §3.3). My own mutants find three forms the comment names, and one predicate the root row was meant to cover, that still have no row (N1, N2).
  - Owner notice: due on `syzygy-bpyt.10` at landing [Unknown: not yet due].
- **The stop clause.** Nothing any gate accepts or refuses changes. [Observed] 0 product files; the testkit emit is identical; over the tree every island walk and every resolver answer is equal (251/251 and 2,628/2,628; on the merge 254/254 and 2,645/2,645). Even if test guards are read as gates, their accept/refuse set is the resolver's, and it is unchanged: the new rows only pin existing answers. No refusal is added or removed. **Nothing here returns to the owner under `:95-96`.** N3 names one refusal from #531 that no record names; naming it is a matter for the owner notice, not a change.

## 3. What I ran, and the results

Clones: `base` at `e5080f4d`, `code` at `831f40c1`, `clone` at `c1227667`, `merge` at `c117df15`, each with `npm ci` (`added 116 packages`; 117 on the merge). Node `v24.6.0`, npm `11.5.1`. Every vitest run used a private TMPDIR (`/tmp/r536-<n>`), removed after; `ls -d /tmp/r536-*` finds none now. Every tree was clean after every run (`git status --porcelain` empty, and mut.py's `cleanAfter` true in all 89 mutant runs).

### 3.1 The four guard files, repeated (`tools/run_guards.py`)

| Tree | Runs | Result | load1 | Timeouts |
|---|---|---|---|---|
| `e5080f4d` | 1 | `Tests  157 passed (157)` | 64.1 | 0 |
| `831f40c1` | 1 | `Tests  165 passed (165)` | 31.2 | 0 |
| `c1227667` | 5 | `Tests  165 passed (165)` in each | 43.1, 47.1, 48.2, 49.8, 51.9 | 0 |
| merge `c117df15` | 5 | `Tests  165 passed (165)` in each | 54.8, 59.0, 62.5, 63.0, 67.3 | 0 |

[Observed] `Test Files  4 passed (4)` in every run. The new rows hold on the merge.

### 3.2 The #531 reviewer's 18 mutants, unchanged

[Observed] `tools/mut.py` is a copy of `docs/evidence/guard-pins-review-2026-10-27/tools/mut.py`, sha256 `ca2b8eadc503305bb3767b7220b02775429164ef6c183ac9854acf9d8ed9b6a5`, the same bytes as `docs/evidence/argv-guards-review-2026-10-25/tools/mut.py` at all three commits. The specs are `rev-specs-head.json`, sha256 `75e48a1b998d817b76f463667848c7e51b7f57a255ff3801d1b4cb52878b2aaa` at `e5080f4d`, `831f40c1` and `c1227667` alike. Each `old` occurred once in its file at each commit (mut.py asserts it).

- **At base `e5080f4d`** (`rev531-at-base.log`): R1–R6, C1, C4, S2 and T3 each `survives 0 ['Tests  157 passed (157)']`. R7, R8, C2, C3, S1, T1, T2 and T4 are killed.
- **At code head `831f40c1`** (`rev531-at-code.log`): 17 killed, and only T3 `survives 0 ['Tests  165 passed (165)']`. Each target's failing rows:
  - R1: "reads a bare name declared as a ./ path dependency as naming no module" and "… a dependency on its own directory …" (`Tests  2 failed | 163 passed (165)`);
  - R2: "… a dependency on its own directory …";
  - R3: "… a .tar dependency …" and "… a .tar.gz dependency …";
  - R4: "leaves a bare name declared as a registry tilde range outside the workspace";
  - R5: "leaves a bare name declared as a git dependency whose path holds .tgz outside the workspace";
  - R6: "reads the workspace root's manifest beside the packages'";
  - C1 and C4: "reads every module TypeScript compiles under src, .mts, .cts and .tsx among them, and no test module";
  - S2: "reads every src directory to its depth".
- **Kill alone.** Each failing row above is an independent `it` or `it.each` row, so each kills its target by itself. Where two rows fail (R1, R3), each is a separate kill. For the census row I evaluated the two regexes over its twelve fixture names in `node`: C1 adds only `notes.ts.md` to the census, and C4 removes only `latest.ts` (`head latest.ts,main.ts,reader.cts,reader.mts,view.tsx` / `C1 latest.ts,main.ts,notes.ts.md,…` / `C4 main.ts,reader.cts,…`). So each new fixture name kills its own target.
- **The other eight** are killed at both commits; at head none fails fewer rows than at base, and R8 fails two (it adds the `.tgz.git` control).
- **On the merge** (`rev531-at-merge.log`): the same outcome and the same failed-row set as at code head for 18 of 18.
- **The lane's records reproduce.** `tools/check_record.py` compares `premise-base.json` and `targets-head.json` with my runs: `premise-base.json: 18/18 equal to rev531-at-base.json` and `targets-head.json: 18/18 equal to rev531-at-code.json`, by outcome and failed-row set.

### 3.3 The lane's own mutants O1–O4, reproduced

[Observed] With the lane's `own-specs.json` and the same mut.py, over the three testkit-importing guard files (argv.test.ts does not import the testkit: its imports are `node:fs`, `node:path`, `node:url`, `typescript`, `vitest` and `./argv.js`):
- at base each `survives 0 ['Tests  72 passed (72)']`;
- at code head each is killed with `Tests  1 failed | 78 passed (79)`, by exactly its own row: O1 by the remote tarball URL row, O2 by the `.tar` row, O3 by the `.tar.gz` row, O4 by the root row.

### 3.4 My own mutants (`tools/rev_specs.py`, `rev536-specs.json`)

Eleven, against the new rows and the comment's claims, over all four guard files:

| Id | Mutation | Base `e5080f4d` | Head `831f40c1` | Killed at head by | Residual? |
|---|---|---|---|---|---|
| M1 | the tarball arm skips an `https:` URL (`^(?!https:).*\.(?:…)$`) | survives 157/157 | killed, 1 row | the remote tarball URL row alone | — |
| M2 | the tarball arm skips an `http:` URL only | survives | **survives 165/165** | — | not named (N2) |
| M3 | the tarball arm needs a leading `./` | killed (tarball row) | killed, 4 rows | `.tar`, `.tar.gz`, URL and tarball rows | — |
| M4 | the census extension test also takes `.ts.md` (`(?:\.md)?$`) | survives | killed, 1 row | the census row alone | — |
| M5 | `treeFiles()` keeps paths at most two segments under `src` | survives | **survives 165/165** | — | equivalent on both trees: 0 of 505 tracked files under `*/src` at `c1227667` (0 of 511 on the merge) are three or more segments deep |
| M6 | the root entry keeps only `name` and `dependencies` | survives | killed, 1 row | the root row alone | — |
| M7 | the `npm:` arm refuses only `npm:@syzygy/…`, so a registry alias reads as outside | survives | **survives 165/165** | — | not named; the PR says it is pinned (N2) |
| M8 | `localNames` skips the manifest whose `dir` is `.` (the root's) | survives | **survives 165/165** | — | not named (N1) |
| M9 | `..` alone reads as outside; `.`, `./x`, `../x` stay local | survives | **survives 165/165** | — | not named (N2) |
| M10 | the census test exclusion's `$` dropped | survives | **survives 165/165** | — | equivalent: 0 of 503 TS modules under `*/src` (0 of 509 on the merge) are excluded by it alone |
| M11 | the N3 residual refused (`\.` and `[^:]*\/` added as alternatives of the first arm) | survives | **survives 165/165** | — | the named N3 residual: the PR says "No row pins them as outside" |

### 3.5 Proposed rows, checked (`tools/fix_specs.py`, `rev536-fix-at-code.log`)

[Observed] At `831f40c1` I added four rows to `workspace-reach.test.ts` (in a scratch clone; restored by mut.py):
- in "reads a bare name declared as %s as naming no module": `['a remote http tarball URL dependency', 'dossier', { dependencies: { dossier: 'http://example.com/lib-1.0.0.tar.gz' } }, {}]`, `['an npm: alias of a registry package', 'dossier', { dependencies: { dossier: 'npm:typescript@^5.5.0' } }, {}]` and `['a dependency on its parent directory', 'dossier', { dependencies: { dossier: '..' } }, {}]`;
- after the root row, a row that gives the synthetic workspace a root manifest (`{ name: 'root', dir: '.', devDependencies: { dossier: './packages/lib' } }`) and expects `resolveIn(…, 'apps/app/src/main.ts', 'dossier')` to be undefined (exact text in `rev536-fix-specs.json`).

Results: `FIX-rows-only survives 0 ['Tests  169 passed (169)']`. With M2, M7, M8 or M9 applied as well, each run is killed with `Tests  1 failed | 168 passed (169)`, and the one failing row is that mutant's own new row.

### 3.6 npa probe

- [Observed] The lane's `npa_probe.cjs` (sha256 `61da250ff658e7c75e876e5586d4576dca97141adcd94e49a701df6a54670053`) reads npm-package-arg from this node's bundled npm: `"version": "12.0.2"`. Its output at `c1227667` parses equal to the lane's `npa-probe.json` (`equal to lane record: True`), and its output on the merge is byte-identical to that at `c1227667` (`cmp`: same). All 17 comment forms and 20 row versions fall as the lane says: the 7 path forms and `file:../x` are `directory`; `x.tgz`, `x.tar`, `x.tar.gz` are `file`; `link:../x` and `workspace:*` give `throws EUNSUPPORTEDPROTOCOL`; `npm:@syzygy/lib@*` is `alias`; `https://example.com/x.tgz` is `remote`; all 14 are refused. The three residual forms are `directory` and read as outside. The five outside controls are `version`, `range`, `git`, `range`, `git`.
- [Observed] My own probe (`tools/npa_probe2.cjs`, which takes the pattern by evaluating the testkit's literal) over 22 more forms:

| Form | npa 12.0.2 | Pattern |
|---|---|---|
| `git+https://example.com/lib.tgz` | `git` | refused |
| `git+ssh://git@example.com/lib.tar` | `git` | refused |
| `someone/dossier.tgz` | `git` | refused |
| `github:someone/dossier#v1.tar` | `git` | refused |
| `http://example.com/lib.tar.gz` | `remote` | refused |
| `https://github.com/someone/dossier/archive/v1.0.0.tar.gz` | `remote` | refused |
| `https://example.com/lib` | `remote` | outside |
| `npm:typescript@^5.5.0` | `alias` (subSpec `range typescript`) | refused |
| `npm:@syzygy/lib@*` | `alias` (subSpec `range @syzygy/lib`) | refused |
| `FILE:../x` | `directory` | refused |
| `file:x.tgz` | `file` | refused |
| `..` | `directory` | refused |
| `lib.TGZ` | `file` | refused |
| `git+file:../../packages/lib` | `git` | outside (named since #531) |
| `C:/lib`, `.\lib`, `lib/` | `directory` | outside (inside the residual sentence) |
| `packages/polaris-dossier` (no trailing slash) | `git` | outside |
| `lib.tarXgz` | `file` | outside |
| `~`, `~lib`, `x.tar.bz2` | `tag` | outside |

  Also [Observed]: npa refuses an alias of a non-registry spec (`npm:../../packages/lib` and `npm:lib@file:../x` both throw "aliases only work for registry deps"), and `npa.resolve('dossier', 'npm:@syzygy/polaris-dossier@*')` has `name` `dossier` and subSpec `{"type":"range","name":"@syzygy/polaris-dossier","registry":true}`. `lib.tarXgz` is `file` because npa's tarball test leaves the dot of `tar.gz` unescaped (`npm-package-arg/lib/npa.js:17` "const isFileType = /[.](?:tgz|tar.gz|tar)$/i"); it is not a directory spec, and I raise nothing on it.
- [Observed, by reading npm's own source, @npmcli/arborist `9.1.3` as bundled with npm 11.5.1] `lib/arborist/build-ideal-tree.js:1227` "const isWorkspace = this.idealTree.workspaces && this.idealTree.workspaces.has(spec.name)", and `:1250-1258` return the workspace node only when that holds, and otherwise `this.#fetchManifest(spec)`. For an `npm:` alias, `spec.name` is the dependency's own name (above), so npm fetches the alias target from the registry. (N4.)

### 3.7 The testkit's code is unchanged

[Observed] `tools/strip_compare.cjs` (TypeScript `transpileModule` with `removeComments`): base against head `{"emitEqual":true,"emitBytes":[4559,4559]}`; base against the merge `{"emitEqual":true,"emitBytes":[4559,4559]}`; base against a copy with the pattern's final `$` deleted `{"emitEqual":false,"emitBytes":[4559,4558]}`. The `LOCAL_VERSION` line at `831f40c1` occurs verbatim at `e5080f4d` (`check_record.py`).

### 3.8 The island differential, at both trees

[Observed] `tools/island_diff.py` is the 8.36 lane's tool, sha256 `131206846b062bc60ba7efeb67bf6ecf81802a54921d94979f2bc7428b8afc04`, unchanged at all three commits.

| Tree, mode | Walks equal | Answers equal | Over | By answer (new side) |
|---|---|---|---|---|
| `831f40c1` against `e5080f4d`'s testkit | 251 / 251 | 2,628 / 2,628 | 503 modules | module 1,559, null 1,069, undefined 0 |
| same, `--selftest` | 61 / 251 | 1,338 / 2,628 | | undefined 1,290 |
| same, my variant `island_diff_v_caret.py --selftest` (a `^` range reads as local) | 251 / 251 | 2,371 / 2,628 | | undefined 257 |
| merge `c117df15` against `e5080f4d`'s testkit | 254 / 254 | 2,645 / 2,645 | 509 modules | module 1,618, null 1,027, undefined 0 |
| merge, `--selftest` | 56 / 254 | 1,351 / 2,645 | | undefined 1,294 |

- At `831f40c1` the answer digests equal the lane's: walks `2e84163f9d33a00c…`, answers `65d99f1803c11872…` (both records name the full digests). The selftest's 190 walks and 1,290 answers that differ match the lane's `island-diff-selftest.json`.
- My variant changes only the selftest's mutant, to a change of the version pattern (`/^(?:\^|file:`). It shows the differential sees a change to the pattern, not only to the `.js` candidate: the first unequal answer is "apps/three-surface-poc/src/block-provenance-sweep.test.ts imports vitest: null -> undefined". The walks stay equal under it, because the walk's specifiers reach no root devDependency.
- The testkit was restored after each selftest (sha256 `ed67106fe74333c97f419f4a52f14f75bfaa34bbfa5b41f33c4f1b6545895731`, HEAD's), and each tree was clean.

### 3.9 Can a faithful tree fail it? (`tools/sweep.cjs`)

[Observed] Population: every manifest the testkit reads (the root, and each `apps/*` and `packages/*` directory holding a `package.json`), every dependency field, every version; each version typed by npa 12.0.2 and tested against the tree's pattern.

| Tree | Manifests | Tracked `package.json` anywhere | Versions | dependencies / devDependencies / optional / peer | npa types | Match the pattern | npa `directory` or `file` |
|---|---|---|---|---|---|---|---|
| `c1227667` | 12 | 12 | 24 | 21 / 3 / 0 / 0 | version 21, range 3 | 0 | 0 |
| merge `c117df15` | 13 | 13 | 29 | 26 / 3 / 0 / 0 | version 26, range 3 | 0 | 0 |

No version is directory-shaped by npa's own test, so no faithful tree at either commit takes a form the guards refuse or a residual form. The guard files pass at both (§3.1).

### 3.10 Titles

[Observed] `npx vitest list --json` over the four guard files: base 157, head 165; 8 added (7 in `workspace-reach.test.ts`, 1 in `argv.test.ts`), 0 removed, 0 duplicated at either commit. Per file: `argv.test.ts` 85 → 86, `workspace-reach.test.ts` 41 → 48, `subpath-imports.test.ts` 27 → 27, `island-boundary.test.ts` 4 → 4. The diff changes exactly two other rows' bodies (the root row and the census row). **`Tests: +8 ~2 -0`**, as the PR says.

### 3.11 The record

- [Observed] `record.py --check` (in the `c1227667` clone): `summary.json matches ; problems: 0`, exit 0. `--selftest`: `selftest: 31/31 mutations make a check fail`, exit 0.
- [Observed] `tools/check_record.py` reads every lane file from the `c1227667` blob and checks: both parents; that the evidence commit touches only its directory; the subject and code digests; each run's `head` against BASE or HEAD; each result's `edits` against its spec; each `old` occurring exactly once in its file at the commit it ran (`git show <commit>:<file>`); each outcome against its exit and failed rows; the failed count against the `Tests` line; timeouts and clean trees; the island-diff records' base, head, exit, clean tree, tool digest and old-testkit digest; the probe's pattern line. Result: `"problems": []`.
- Digests, by script (`check-record.json`): `record.py` `b71fde367eacb4111cf84a6e4123d35c161ed5839c39b1cf91fa7894896a5357`, `summary.json` `516a87e429e28953626e37bff3af42617947a5bf67811e22a9a0792541b57882`, `npa_probe.cjs` `61da250f…`, `own_specs.py` `c1c6b529fa6438df165886a679a33588e8650a2e5e2d9231c633d3bcac5f12e3`, `island_diff.py` `13120684…`, `mut.py` `ca2b8ead…`, `repeat.py` `1c87146329e02d971d45eedc8da090c1fd7805dfa8869d0d4cacda99b63572af`, `titles.py` `f93af94f73fc70a5e9de768b146cca579c73eb8663e3285d574c8ad7193697e5`. Each matches the PR body where the body names it.
- Rule 11: `summary.json` names its subject (`git diff e5080f4d 831f40c1`) and that diff's sha256. `repeat-runs.json`, `titles.json` and `npa-probe.json` name no commit; `record.py` ties the first two to HEAD by content (165 is HEAD's count; every added row's literal is in HEAD's blob and not BASE's). The probe's tie ("the probe's pattern line is HEAD's") does not tell BASE from HEAD, since the line is the same at both; the probe's answers cannot differ between them, so this costs nothing.
- Every PR-body claim I checked against the record holds, except three sentences: the `npm:` pinning sentence (N2), "Main has not moved since the branch point" (N5) and "a git dependency stays outside" (N3). The battery line is unverified (N5).

### 3.12 Typecheck, governance, quotations, hosted checks

- [Observed] `npm run typecheck` at `c1227667`: exit 0; on the merge: exit 0 (its script now builds `packages/support` first). Rule 6: a type error put into `workspace-reach.test.ts` (`join(ROOT, 1)`) makes `tsc -b packages/polaris-generation-core` exit 1 with "error TS2345: Argument of type 'number' is not assignable to parameter of type 'string'.", so the typecheck covers the test files.
- [Observed] `python3 scripts/check_governance.py` at `c1227667`: exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted".
- [Observed] `python3 scripts/check_quotations.py` at `c1227667`: exit 0; "OK    QC-1  a quotation beside a path:line locator was said by that file — 37 quotations examined in 18 of 951 .md files scanned (loc-paren-quote 2, loc-colon-quote 25, quote-paren-loc 10), 0 findings".
- [Observed] `gh pr checks 536`: `checks pass` and `node pass`.
- [Unknown] The PR's battery line (`commands=110 nonzero=0`): I did not re-run the battery.

## 4. Findings

No blocking findings. Four notes and one process note. Each is a pre-existing gap, a claim correction or a comment-completeness point; none needs a byte of the subject changed before merge, and none changes what a gate accepts or refuses.

### N1 — No row pins that the resolver reads the root manifest's declarations (low)

- **Evidence.** [Observed] M8 (`localNames` skips the manifest whose `dir` is `.`) survives 165/165 at `831f40c1` and 157/157 at `e5080f4d`.
  - The new root row (`workspace-reach.test.ts:118`) pins what `WORKSPACE` holds for the root, and kills R6, O4 and M6. But every resolver row uses the synthetic `workspace()` of two packages, which has no root manifest, and the real root declares only three registry ranges. So no row sees the root's declarations used.
  - The test comment above the table (`:81-82`) says "Any manifest's declaration counts, the workspace root's among them". The #531 tree mutant T1 (a root `./packages/polaris-dossier` alias) is killed only as a tree mutant, not by a row.
  - AC1 is met, since R6 is killed by its own row. This is the same predicate in another spelling, present since #531.
- **Failure scenario.** A tidy of `localNames` (8.5's import tidying is next) skips the root, or reads only the importing package's ancestors. Later, `"dossier": "./packages/polaris-dossier"` in the root `devDependencies` reads as outside, and the daemon loads the barrel with all 165 rows green. That is the N1 failure scenario of the #531 review, which the root row was meant to close.
- **Proposed fix**, checked in §3.5 (169/169 together; it kills M8 alone): after the root row, add
  `it("reads a bare name the workspace root's manifest declares as a local dependency as naming no module", () => { const { manifests, isFile } = workspace({}); const root: Manifest = { name: 'root', dir: '.', devDependencies: { dossier: './packages/lib' } }; expect(resolveIn({ manifests: new Map([...manifests, [root.name, root]]), isFile }, 'apps/app/src/main.ts', 'dossier')).toBeUndefined(); });`

### N2 — Three refusals the comment names have no row, and the PR says the `npm:` one is pinned (low)

- **Evidence.** [Observed] Each of these survives 165/165 at head (and 157/157 at base):
  - M7: the `npm:` arm narrowed to `npm:@syzygy/`, so an alias of a registry package reads as outside. The table's only `npm:` row (`:90`) aliases `@syzygy/lib`.
  - M9: `..` alone reads as outside. The comment lists `..` (`testkit:60`); the bead's `.` row kills R2 (both dropped) but not this split.
  - M2: an `http:` tarball URL reads as outside. The URL row (`:99`) uses `https:`.
  - The PR body says: "The two refusals the #531 notice already names are now pinned and described." That is true of the tarball URL (O1 and M1 are each killed by the URL row alone) and false of the `npm:` registry alias, which no row pins. The test comment at `workspace-reach.test.ts:82-83` ("A remote tarball URL and an `npm:` alias of a registry package read as naming no module too") sits on a table with no registry-alias row.
  - The bead's fix direction asked for the URL row only, so the bead is met. This is a claim correction and a pinning gap.
- **Failure scenario.** A later ruling or tidy narrows the `npm:` arm to workspace-named aliases, or writes the path arm as `\.\/|\.$|\.\.\/`, with CI green. The comment and the owner notice still say the form is refused, so the record says one thing and the guard does another, and the next reader relies on a refusal that is gone.
- **Proposed fix**, checked in §3.5 (each kills its own mutant alone): add to "reads a bare name declared as %s as naming no module" the rows `['an npm: alias of a registry package', 'dossier', { dependencies: { dossier: 'npm:typescript@^5.5.0' } }, {}]`, `['a dependency on its parent directory', 'dossier', { dependencies: { dossier: '..' } }, {}]` and `['a remote http tarball URL dependency', 'dossier', { dependencies: { dossier: 'http://example.com/lib-1.0.0.tar.gz' } }, {}]`. Until then, the dispositions record should say that the `npm:` registry-alias refusal is described but not pinned.

### N3 — Unnamed refusal: the tarball arm also refuses a git dependency whose spec ends in a tarball extension (low)

- **Evidence.** [Observed, §3.6] npa 12.0.2 types `git+https://example.com/lib.tgz`, `git+ssh://git@example.com/lib.tar`, `someone/dossier.tgz` (GitHub shorthand) and `github:someone/dossier#v1.tar` as `git`, and the pattern refuses all four, so the resolver answers that each names no module.
  - The PR body's residuals say "Unchanged from #531: a git dependency stays outside". That is false for these four forms.
  - The testkit comment's tarball sentence (`:66`) names only the `remote` tarball URL. The #531 dispositions' list of refusals beyond the bead's (N6) and its owner notice name path versions, local tarball names, remote tarball URLs, `npm:` registry aliases and the root manifest, but not this.
  - The new control row "a git dependency whose path holds .tgz" (`git+https://example.com/lib.tgz.git`, `:112`) is outside only because of its `.git` suffix.
  - [Observed] 0 of 24 versions at `c1227667`, and 0 of 29 on the merge, take this form (§3.9). The pattern is unchanged from #531, so this PR changes nothing here.
- **Failure scenario.** A dependency like `"lib": "github:someone/lib#v1.tar"` is added and imported on the daemon path or the CLI walk. Both guards fail on a faithful tree, and the author, told that a git dependency stays outside, misdiagnoses the failure or loosens the guard to get past it. That is the #531 N2 scenario in another form.
- **Proposed fix.** Name the form in this round's dispositions record, beside N2's kept refusals, and in the owner notice on `syzygy-bpyt.10`. It fails closed in a test guard and changes no answer in the tree, so under the #528/#531 reasoning it is within the fix direction once named. Narrowing the arm (for example excluding any spec with a scheme or with `#`) would change what the guard refuses and needs a GP-Q0 ruling. Optionally, a later comment-only change can add "and a git spec whose text ends in a tarball extension (npm types it `git`)" to `:66`.

### N4 — The `npm:` clause does not say that npm installs every alias from the registry (low)

- **Evidence.**
  - The bead's N2 fix direction: "Fix the testkit comment at :59-60: npm installs an `npm:` alias from the registry, does not install `link:` or `workspace:` at all (npm-package-arg 12.0.2 throws EUNSUPPORTEDPROTOCOL), and types a tarball URL as `remote`."
  - The comment (`testkit:64-65`): "`npm:`: an alias of another package, which may be a workspace package's name. An alias of a registry package is refused too, failing closed." It covers the other two points (`:62`, `:66`), but not "from the registry".
  - [Observed, §3.6] npa accepts only a registry spec after `npm:` ("aliases only work for registry deps"). The alias's own `name` is the dependency name, and arborist 9.1.3 links a workspace only when that name is a workspace's (`build-ideal-tree.js:1227`, `:1250-1258`); otherwise it fetches the manifest.
  - So under npm every `npm:` alias is "an alias of a registry package", and the comment's implied contrast between a workspace-named alias and a registry alias does not exist for npm. [Inferred, from package-manager documentation, not probed] Other package managers (yarn's transparent workspaces, for example) can link a range whose name is a workspace's, which is the only sense in which the clause's "may be a workspace package's name" makes the form possibly local.
  - No sentence is false: each is true of the spec string and of the pattern. I do not count it as a "comment sentence that is false for npm".
- **Failure scenario.** A reader takes the clause to mean that npm may install an `npm:` alias from the workspace, and relies on that when the owner rules on N2's kept refusals or on narrowing the arm. That ruling is then made on a premise npm does not hold.
- **Proposed fix**, a comment-only follow-up with no gate change: "`npm:`: an alias. npm installs it from the registry (npm-package-arg 12.0.2 accepts only a registry spec after `npm:`), but its target may carry a workspace package's name, which other package managers can link locally; every alias is refused, failing closed."

### N5 — Process: two PR-body sentences are stale or unverified (process)

- **Evidence.** [Observed]
  - The PR body says "Main has not moved since the branch point." The body was last updated `2026-10-27T02:48:12Z`, and PR #530 merged `2026-10-27T03:07:38Z` as `f7477f52`. The sentence was true when written and is false now. It changed root and workspace manifests, which are the resolver's inputs.
  - The battery line ("`commands=110 nonzero=0`") is the lane's; I did not re-run it [Unknown].
- **Failure scenario.** The dispositions record copies "main has not moved" and lands without merge evidence. A later reader then cannot tell whether the guards were checked against the manifests #530 added.
- **Proposed fix.** The dispositions record says main moved, and cites this review's merge results at `c117df15` (tree `55c93a57`): 165/165 in 5 of 5 runs; 18/18 #531 mutants the same; island 254/254 and 2,645/2,645; sweep 13 manifests, 29 versions, 0 local, 0 directory-shaped. Re-run the battery on the rebased head before landing (rule 7).

## 5. Every changed output, or the evidence that there is none

None. [Observed]
- The code diff is three test-side files: two `*.test.ts` files and `workspace-reach.testkit.ts`, which only the three guard tests import (`grep` of `workspace-reach.testkit` over `apps`, `packages` and `scripts`) and which no `exports` entry names. The other 18 paths are evidence under `docs/evidence/syzygy-bpyt-8-38/`.
- The testkit's comment-free emit is identical at base, head and the merge (§3.7). The `LOCAL_VERSION` line is unchanged.
- Over the tree, every island walk and every resolver answer is equal at both trees (§3.8).
- No `package.json`, no rendered byte, no wire format, no refusal string and no exit code is in the subject. `npm run typecheck` exits 0 at both trees.

## 6. Verdict per acceptance criterion

- **AC1, R1–R6, C1, C4 and S2 each survive at the base and are killed at head by their own row, recorded with old/new fragments and commits: met.** [Observed] All nine survive 157/157 at `e5080f4d` and are killed at `831f40c1`, each by its own new or changed row (§3.2). The same holds on the merge. Every record carries `old`/`new`, and each `old` occurs once at the commit it ran (§3.11). N1 adds a related predicate that the bead did not list.
- **AC2, the comment matches npm's behaviour per N2 and names the N3 residual, and a URL row pins its refusal: met, with notes.** [Observed] Every comment claim holds for npa 12.0.2 (§3.6), and the URL row kills O1 and M1 alone. The residual is named without any claim that it is pinned or ruled ("Those still read as outside the workspace; widening the pattern to them changes what the guards refuse and needs a GP-Q0 ruling first."), and M11 confirms that no row pins it. N3 and N4 are completeness notes on the comment.
- **AC3, island walk and resolver answers unchanged over the tree; Tests delta stated; independent review; GP-Q0 differential, mutants and owner notice: met.** [Observed] 251/251 and 2,628/2,628 (254/254 and 2,645/2,645 on the merge), with the selftest and my variant failing as they should. `Tests: +8 ~2 -0`, re-derived. This review. Mutants: §3.2–3.4. The owner notice is due at landing [Unknown: not yet due]; it should add N3's form.

## 7. Test quality

- **Bar 4, the root row.** The new root row (`:118`) is neither a literal nor read from the code under test's output. It re-reads `package.json` with its own `readFileSync`, and shares only `ROOT` with the testkit. It then builds `{ dir: '.', ...parsed }`, the same construction as `testkit:30-31`.
  - I rule it independently derived in bar 4's sense ("Expected values are literals or independently derived"). It derives the expected entry from the input, not from the testkit's result, and it kills R6, O4 and M6, each alone. A shared fault in `ROOT` would fail every tree row loudly, not pass this one.
  - A literal would have gone stale: #530 changed the root `package.json` (its `build`, `build:poc` and `typecheck` scripts), and the row passed on the merge 165/165 because it reads the file.
  - Its limit is N1: it pins the entry, not the resolver's use of it.
- **Bar 10.** +8 rows, each extending the nearest existing table (seven `it.each` rows, and the census row's fixture) or adding one `it` (the depth row). Each catches a mutant no other row catches (§3.2, §3.3). Net `+8 ~2 -0`; nothing is duplicated.
- **Bar 6.** 5/5 at `c1227667` (load1 43–52) and 5/5 on the merge (load1 55–67), with 0 timeouts in these runs and in all 89 mutant runs.
- **Bar 7.** Every kill names the form in its title ("… a .tar.gz dependency …"), so a failure localizes without the source.
- **Bars 1 and 8, the depth row.** `'reads every src directory to its depth'` (`argv.test.ts:262-264`) asserts a real product path in another package, `apps/three-surface-poc/src/polaris-generation/self-corpus.ts`. #530 edited that file. A rename by an unrelated bead would turn the census suite red with a message about recursion. It fails loudly rather than silently, so I raise no note. A more robust form compares `treeFiles()` with the `git ls-files` paths under each `src`. M5 (a depth limit of 2) survives, but it is equivalent: the tree's deepest path is two segments under `src`, 0 of 505 deeper (§3.4).
- **Bar 3.** The new rows are edge forms (bare `.`, `.tar.gz`, `~1.2.3` against `~/`, `.tgz` mid-path). N2's three forms are the remaining edges the comment names.
- M10 (the exclusion's `$`) survives and is equivalent on both trees; it is not a plausible bug I would ask a row for.

## 8. Cleanup

- Deleted: the four scratch clones (`clone`, `base`, `code`, `merge`) and every TMPDIR (`ls -d /tmp/r536-*` finds none). I also deleted the re-derived subject diff (329 KB, `cmp`-equal to the subject file), the island-diff stdout logs (the same JSON as the kept `.json` files) and two empty `vitest list` logs. No kept file is over 300 KB.
- I never touched `/home/tze/GitHub/syzygy` or any worktree beyond `git clone`, read-only `git`, `bd show` and `gh pr view`/`gh pr checks`.
- Kept: 11 tools under `rev-536/tools/`, and 49 result files plus this raw in `rev-536/`. The paths are relative to `rev-536/`. `tools/mut.py`, `tools/island_diff.py` and `tools/lane_npa_probe.cjs` are byte copies of the repository's tools. `rev531-specs-head.json` and `lane-own-specs.json` are copies of the reviewer's and the lane's specs.

| Path | sha256 |
|---|---|
| `tools/check_record.py` | `e2bde1fb33cd0231ae12cbe846642b20b8c6d2e5fc402c0721d8d51ae945f6dd` |
| `tools/fix_specs.py` | `c98fe72dfe45c15ef6d8be579f92e222590b8f13d70ed2640799bfc26065f1c5` |
| `tools/island_diff.py` | `131206846b062bc60ba7efeb67bf6ecf81802a54921d94979f2bc7428b8afc04` |
| `tools/island_diff_v_caret.py` | `9160aa15999bab06fd4bbdd24b480129f5c916f2fef242797b4bf0e4897cf30e` |
| `tools/lane_npa_probe.cjs` | `61da250ff658e7c75e876e5586d4576dca97141adcd94e49a701df6a54670053` |
| `tools/mut.py` | `ca2b8eadc503305bb3767b7220b02775429164ef6c183ac9854acf9d8ed9b6a5` |
| `tools/npa_probe2.cjs` | `10dc0bacd5a14e5b48f988a08089838874943b19b7649d0f4c8f9e57a1e8b07a` |
| `tools/rev_specs.py` | `dcfd1d081b64efeab46a0e810c88237b8161f9a0ca4517ae69227f763cd01874` |
| `tools/run_guards.py` | `8e71b58d57b34e2b3624bca3a604b7da1e7daeb86d78378c3d52a34ee0715608` |
| `tools/strip_compare.cjs` | `34f77218ab51f6bdfa109d7ff6abeee443763e7387c0cd4510b0095d83f6d512` |
| `tools/sweep.cjs` | `df6825f66e4e74f55689216f3883cd44ee606292d6c2f07d44003b26fc9a1ee4` |
| `check-record.json` | `44537de4ee065fdef8643b5cc3507dcc07fa3373f7d89246d91f0f08e4f834d2` |
| `governance-head.log` | `cfea26d6c91d8a139d0323135ec5477cc33c191879f4713604e8831ec6bfb974` |
| `guards-base-x1.json` | `e6ff9cb6db7bd32776af808d4aad40d505ba68886f8e2635c01176cd38acf84d` |
| `guards-code-probe.json` | `5e602f1a6172bb92ba531e9319f129c51798d8b9ca73213214d7c4f1fdc71272` |
| `guards-head-x5.json` | `e89bd27a2261c8df2843bf588d158a0c6c107fc482da55c6e7cae74d857ca176` |
| `guards-merge-x5.json` | `ad306d193335ef3add1813d77c610351918b21e077ccd8ef8d8f9db7ca257ea3` |
| `island-diff-code-selftest.json` | `b02348943aee145a53f3826c6927942f5d444aad24d2bdecc3a38a5bdfe9986b` |
| `island-diff-code-vcaret.json` | `34ea803e48e83c18e09b2ce6fe759eb94b8621666d2c45267551680325962047` |
| `island-diff-code.json` | `61eab546a2e93e14e79537bdb88c528ec0975c4cb47df32a7b8c0fdd8906432f` |
| `island-diff-merge-selftest.json` | `cbb6f588c7a262435320b692ebf292c0790ef3732218a0e6d95d3427a917265d` |
| `island-diff-merge.json` | `10d97709cd5d9d9381955417b8a404a3dfd1f34e5bc2f23f46ec6f3d3a81d6b7` |
| `lane-own-at-base.json` | `deab0aeb426e4381e6c5a67d952ead30a60353767d4d7981c6adf2e0c82781f0` |
| `lane-own-at-base.log` | `385106dfb5b30b502dac09fa59f95d73a709bb30dc8d5df0b00f05566e4e439c` |
| `lane-own-at-code.json` | `fb0129da104fdee9095a3dbdcc53421c8d382f3d23ff081727e4fcb121c31d8b` |
| `lane-own-at-code.log` | `ee81939e851f8788274a94e23856e6977af75fd850470181814e3d10d5a5f0df` |
| `lane-own-specs.json` | `b1a69ed8b1adf60eaf0dcc7e3d0e0673ac40b35ee96826818c8313f3a18886c6` |
| `main-changed-paths.txt` | `455c1880659300cf0166acba23034557437ba776466b12179b068ee8e7b3269b` |
| `npa-probe-head.json` | `b2395efe78c31b83466194c0927e86a263740cb67ad6fe511687584f16e60dc9` |
| `npa-probe-merge.json` | `b2395efe78c31b83466194c0927e86a263740cb67ad6fe511687584f16e60dc9` |
| `npa-probe2-head.json` | `f59522ab24aeae8af9984e99a15b9ba36a0007542c5799879c232915d2fe814f` |
| `npm-ci-base.log` | `5464053aeda196a2e708be77e27168eb1611fb4ca82891d6929ad4d83d07497d` |
| `npm-ci-code.log` | `5464053aeda196a2e708be77e27168eb1611fb4ca82891d6929ad4d83d07497d` |
| `npm-ci-head.log` | `5464053aeda196a2e708be77e27168eb1611fb4ca82891d6929ad4d83d07497d` |
| `npm-ci-merge.log` | `8948f6f3246243344b904ec08788e37e94fa7dfc6eb823af96968c041b60ac4b` |
| `quotations-head.log` | `75d7903c7118a66147f8ef1b242ca8a11dc883e10a8a8e9a17ad10bffdbb50a7` |
| `record-selftest.log` | `9ea51a27ac18495353605c3726e1e88882bb860c63b9267881b45fd57b066bb7` |
| `rev531-at-base.json` | `1777cb697efc71c1a36dc759f43ec4dc6321c2d5e7f46c2b230f2f368cad0be0` |
| `rev531-at-base.log` | `62f8e48889c6d1b30a777837ae0e777029c5b9fabd07234f15b3c56fa7557bba` |
| `rev531-at-code.json` | `d55f0c0472939dca5f012dc9ebbc94fd22bb8c61b8dbed8238e0c7564e011671` |
| `rev531-at-code.log` | `9809e6da434d09f9aad170f6a451b0866bc13ad59ab05435bab904410e840b3c` |
| `rev531-at-merge.json` | `000a0dd8f6f102788be7e5c5d54df774c81c5e3eb4f4bcb733347e0251fa427d` |
| `rev531-at-merge.log` | `8eb0e054b1174430dfed02c6139a205731bd528828097373bd810cc584861e0d` |
| `rev531-specs-head.json` | `75e48a1b998d817b76f463667848c7e51b7f57a255ff3801d1b4cb52878b2aaa` |
| `rev536-at-base.json` | `c5f7791b5e8cf15d091672656003e38c579632ccd72599674f9199552bc49a70` |
| `rev536-at-base.log` | `102b447bcc253f703a56fd3ac45c69581052981468bd3ba8e6d28ed125a57cae` |
| `rev536-at-code.json` | `c6ca85d517c193bde5f0ab0c4985977f43c8fda0213307516ee502ee3f02e353` |
| `rev536-at-code.log` | `db513139ca9420bfe5604de61196637cc5c295549d2f73282de8657da815367c` |
| `rev536-fix-at-code.json` | `dcecab92e62e975cdcc44bd5914f4cf6e0204d1df4865e11b186d88e471991ba` |
| `rev536-fix-at-code.log` | `b59135a8675328a3b2846c32e71e242e8aad96332b1230cc46e52363fee67c99` |
| `rev536-fix-specs.json` | `db6be993471cd37d6a690a35c88b22d43f2a135606bd038f2631cc84f2b2273b` |
| `rev536-specs.json` | `7b93383a18cc6d339c73ac1ef35778a4c99a9de81ced9807801f7f10a1316fec` |
| `subject-paths.txt` | `fc6f17766fb23b34aa4c7e0661483b2ef1b7b9ea7cb6202db87794df029dce66` |
| `sweep-head.json` | `a6eb5201a019d99a67d9afb7f1f0522c193b5d3a58144e6067cf2e1afe6c4a48` |
| `sweep-merge.json` | `62f2803b49a8a4cdf10c96d65ad0889d0d5d3d70250a9cd7576782f5df1862f6` |
| `titles-base.json` | `04c8b6baeef82d67e1637450d2f27afacd25ea244d1ee115b9c7651946303827` |
| `titles-code.json` | `5b24c7ff143063a1a9c82399cd6b53ba5eebfca6999fdca9947a2aca0f0d3a6a` |
| `typecheck-head.log` | `d0596d3a92a7062daadd2f674be2cf6e1f09cf1c56fab7a5eb2987207abe7381` |
| `typecheck-merge.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |
| `typecheck-mutant.log` | `bb83fa31dcc8773f9c7820a57e3ad839dfb7fac5689f7ba9d9a261e3deb417b2` |
