# R-GP-IMPL-GUARD-PINS-1 — CC-REV-1 implementation review of syzygy-bpyt.8.37, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 138010d5
Subject: r1-review.diff sha256 cb95ae6d6283a641951273f820bc9c33caa04da56555ae92b5c4de8d6c8ef90a

Reviewer: rev-531, a fresh-context CC-REV-1 reviewer. I did not write this change and did not edit it. I read no Butlers or other
observed-repository content and opened no credential file. One read outside the repository, disclosed: to check the PR's
`npm-package-arg` claim I loaded npm's bundled copy (`npm-package-arg` 12.0.2, shipped with the Node v24.6.0 npm under `~/.nvm/`)
by `require()` from `tools/npa_probe.cjs`. That is npm's own parser, not a credential or token store.

Notes only. The six N1 predicates, RV-T18 and RV-C6 all reproduce: each survives at `8ff50172` and is killed at `c90cd732` by the row
added for it. Today's tree is not refused, at the PR's head or at a local merge onto current main. I rule neither flagged form an
unlisted gate change. The notes are about rows that are missing, a refusal the PR states backwards, and an unnamed residual.

## 1. Subject identity checks

[Observed] Every digest below was computed by script in a scratch clone of `/home/tze/GitHub/syzygy`.
- `sha256sum r1-review.diff`, and `git diff 8ff50172 138010d5 | sha256sum`, both give
  `cb95ae6d6283a641951273f820bc9c33caa04da56555ae92b5c4de8d6c8ef90a`. `cmp` of the two byte streams reports them equal. **Match.**
- `git diff 8ff50172 c90cd732 | sha256sum` gives `615db956261b0a5b28d548486fc48282fa0a9ec51e0fe8c928f9f84d0e132fee`. **Match.**
- `git diff --stat 8ff50172 138010d5`: "24 files changed, 16998 insertions(+), 17 deletions(-)". The code diff has 3 files, +106/−17:
  `packages/polaris-dossier/src/argv.test.ts`, `packages/polaris-generation-core/src/workspace-reach.test.ts` and
  `packages/polaris-generation-core/src/workspace-reach.testkit.ts`.
- `git diff --name-only c90cd732 138010d5` names 21 files. All 21 are under `docs/evidence/syzygy-bpyt-8-37/`, and 0 are elsewhere.
- `git merge-base 138010d5 8ff50172` is `8ff50172b127cba676ff32ce62c12c91b2b0d924`. `git log 8ff50172..138010d5` lists exactly
  `c90cd732` and `138010d5`.
- `gh pr view 531` reports `headRefOid` `138010d5beda4a1d39945265388fda0b35d34194` and `OPEN` at the start of the review and again at the
  end.
- **Main moved while I worked.** `gh api …/compare/8ff50172...main` reports main 6 commits ahead at
  `546f1ff066e2ffef749c757cdb4621336039113b` (#529, `@syzygy/http-host`). It changed 99 paths, listed in `main-moved.json`.
  - **0 of them are subject paths.** None of the 3 code files is among them, and none is under `docs/evidence/syzygy-bpyt-8-37/`.
  - Main's changes are **inputs** of the new code, though. They include the root `package.json`, `apps/syzygy/package.json`,
    `apps/three-surface-poc/package.json`, `packages/cap1-daemon/package.json`, a new package manifest, and `apps/syzygy/src/main.ts`.
  - So I merged `138010d5` onto `546f1ff0` locally, as `553d4837`. The merge was clean and its diff against main is the same 24 files,
    +16998/−17. On that merge the four guard files and the island diff pass (§3 items 9 and 10).
  - The lane's evidence holds for `c90cd732` and `138010d5` only (rule 7).

## 2. Clauses relied on (quoted), and the class ruling

Quoted at `138010d5`:
- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
  - `:31` "1. **authority boundaries** — write-universe, typed-authority table," / `:32` "adapter authorization (VIS-5, VIS-6);"
  - `:37` "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - `:40` "6. **public interface** — machine-queryable endpoints, adapter contracts," / `:41` "anything an external consumer can depend on;"
  - `:49` "**The change record states** which classes the change touches, or "none,""
  - `:51` "**A reviewer or the owner** may reclassify at any time."
- GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
  - `:53` "a rendered byte, a wire format, a refusal string or an exit code;"
  - `:62` "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security),
    and class-6 pull requests that remove an endpoint."
  - `:64-66` "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;" / "a rule-6 mutant
    for each predicate;" / "a non-blocking owner notice in the cycle report."
  - **The stop clause**, `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns" / "to the owner."
- `AGENTS.md`:
  - rule 2 `:120` "No "zero / all / 100%" claim without running that exact sweep this"
  - rule 4 `:123` "Read a check's output, not its exit code, and check its denominator"
  - rule 6 `:126` "Mutate the input and confirm the check fails, per predicate, before"
  - rule 7 `:128` "Run the battery in a clone before calling it green; the report is valid"
  - rule 9 `:132` "A claim of absence needs a sweep with a denominator."
  - rule 11 `:134` "An evidence record names its subject and the subject's digest; a record"
  - guardrail `:263` "A rule-6 evidence record must store each mutant's `old`/`new` fragment and"
- The precedent rulings, in `docs/reviews/R-GP-IMPL-ARGV-FAIL-CLOSED-1-RAW.md` §2 (PR #528):
  - It quotes the #524 ruling: "No product byte changes, so nothing any gate accepts or refuses changes, and nothing here returns to the
    owner under `:95-96`."
  - Its own widening ruling: "Every one of these is a fail-closed refusal in a test guard, it changes no answer in the tree, and the PR
    names it ("Unlisted conditions", "Patterns and fallbacks"). I rule it within the bead's fix direction, not a gate change under
    `:95-96`."
- The bead's fix direction for N2 (`bd show syzygy-bpyt.8.37`, read-only): "return undefined for a bare specifier whose package name is
  a dependency declared with a file:, link:, workspace: or npm: version in any workspace manifest (or, more strictly, for any bare name
  no manifest declares), with one row per form."
- The test-rigor bar, by `git show 138010d5:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`:
  - bar 3, `:60` "3. **Edge and failure paths are first-class** — Empty inputs, boundaries,"
  - bar 4, `:64` "4. **No tautologies** — A test that mirrors the implementation's logic to" … `:66-67` "Expected values are literals or" /
    "independently derived."
  - bar 6, `:78-79` "6. **Deterministic or quarantined** — A test that fails intermittently is" / "worse than no test: it trains people to
    ignore red."
  - bar 10, `:93-94` "10. **Growth is governed** — A test is worth *adding* only if it catches a" / "plausible bug no existing test
    catches"

**Class ruling: classes 1, 4 and 6, with no endpoint removed. Classes 2, 3, 5 and 7 are not touched.** The PR declares 1, 4 and 6, and I
agree.
- **Classes 1 and 4: touched.**
  - [Observed] `island-boundary.test.ts:3` imports `reach` from `workspace-reach.testkit.js`, so the testkit's resolver decides what
    the island guard sees.
  - [Inferred, from the #528 ruling, which I re-read] That guard is the rule-6 kill evidence for the 8.1 ruling's class-4 claim
    (provider egress code is unreachable from the CLI) and for its class-1 claim.
  - [Observed] This change turns the resolver's answer for one class of bare names from null ("outside") to undefined ("names no
    module"). It changes the mechanism of the class 1/4 evidence, though no product byte moves.
  - [Observed] Its kill power rises and nowhere falls: over 123 retained reviewer specs, 0 are weaker and 9 are stronger (§3 item 6).
- **Class 6: touched, and no endpoint is removed.** [Observed]
  - The census and the daemon-path guard pin the `./argv` export of `@syzygy/polaris-dossier`, which is an `exports` entry.
  - No `package.json` is in the subject (0 of 11 tracked manifests).
  - `@syzygy/polaris-generation-core` exports only `.` and `./live`, so the testkit's new `WORKSPACE` export is not an endpoint.
  - The testkit's only importers are `workspace-reach.test.ts`, `island-boundary.test.ts` and `subpath-imports.test.ts`
    (`grep -rn workspace-reach.testkit` over `apps packages scripts`).
- **GP-Q0's three checks apply, because the PR touches classes 1 and 4.**
  - **Differential.** It is degenerate for the product, since no product byte changes. The stand-in is non-degenerate and reproduced
    (§3 item 8).
  - **A rule-6 mutant per predicate.** It is met for every target. 10 of my 20 head mutants of the new code survive; they are notes
    N1, N3 and N4.
  - **Owner notice.** Pending: due at landing (N6).

**Ruling on the two flagged forms: neither is a change GP-Q0 `:95-96` returns to the owner. The #528 reasoning holds, with one
exception, which is a note (N2).**
- **(a) Path and tarball versions.**
  - They are fail-closed refusals in a test guard. An `undefined` answer fails both guards' "resolves every" rows (T1 below).
  - They change no answer in the tree. 0 of 20 dependencies match the pattern at `c90cd732`, and 0 of 24 at main `546f1ff0`. The
    island diff is equal (§3 items 5 and 8).
  - The PR names them.
  - The path forms are also needed for fidelity, as `module-sync` was in #528. [Observed, `npa-probe.json`] npm's own parser
    gives `../x`, `./x`, `.`, `..`, `/x` and `~/x` the type `directory`, the same type it gives `file:../x`. So a `../` alias is the
    same installation as RV-T18's `file:` alias, and leaving it out would leave N2's failure scenario one spelling away. It types a
    local `x.tgz`, `x.tar` or `x.tar.gz` as `file`.
  - **The exception: a remote tarball URL.** The tarball arm also matches remote tarball URLs: npm types `https://…/x.tgz` as
    `remote`, and the resolver refuses it. The PR's residuals say the opposite (N2). That refusal also fails closed and changes no
    answer in the tree, so the same reasoning places it within the fix direction. But #528's third condition, "the PR names it",
    is not met until the dispositions record and the owner notice correct the statement.
- **(b) The root manifest.**
  - It fails closed, and it changes no answer in the tree: the root declares 3 devDependencies, all registry ranges. The PR names it.
  - The bead says "in any workspace manifest". [Observed] The root `package.json` is the manifest that declares the workspaces
    (`"workspaces": ["packages/*", "apps/*"]`).
  - [Inferred, from Node's resolution, which walks parent `node_modules` directories] npm installs root dependencies into the root
    `node_modules`, which every workspace module resolves. So it is within the fix direction.
- I read GP-Q0 `:95-96` as the #524 and #528 rulings did: it covers what a product gate accepts or refuses, and this change moves no
  product byte. If the owner reads test guards as gates, every refusal listed in N2 and N6 is one they would need to see. The owner
  notice should list them for that reason.

## 3. What I ran, and the results

All runs used scratch clones and short private TMPDIRs (`/tmp/r531-<n>`), each deleted afterwards. Mutants ran under the #524 reviewer's
`mut.py` (sha256 `ca2b8eadc503305bb3767b7220b02775429164ef6c183ac9854acf9d8ed9b6a5`, the same bytes at `138010d5`). Every mutant run
below reported a clean tree after it.

1. **Identity** (§1).

2. **The #528 reviewer's targets, run unchanged** from `docs/evidence/argv-fail-closed-review-2026-10-25/tools/own-specs-head.json`
   (9 specs extracted to `tools/targets-specs.json`) [Observed, `targets-base.log` and `targets-head.log`]:

   | Mutant | `8ff50172` | `c90cd732` | Row that fails at head |
   |---|---|---|---|
   | RV-P3 | survives, "Tests  52 passed (52)" | killed, "Tests  1 failed \| 71 passed (72)" | "reads a # alias whose target is a module of its own package outside dist as naming no module" |
   | RV-P4 | survives, 52/52 | killed, 1 of 72 | "reads a # alias whose target names no source module as naming no module" |
   | RV-P6 | survives, 52/52 | killed, 1 of 72 | "reads a # alias whose target leaves its package for a module that exists as naming no module" |
   | RV-Q1 | survives, "Tests  81 passed (81)" | killed, "Tests  1 failed \| 84 passed (85)" | the self row `void [[]].map(readArgv);` |
   | RV-Q2 | survives, 81/81 | killed, 1 of 85 | the self row `export function readArgv(): void {}` |
   | RV-Q3 | survives, 81/81 | killed, 1 of 85 | "adds each module's census to what it reports unlifted" |
   | RV-T18 | survives, "Tests  27 passed (27)" | killed, "Tests  1 failed \| 26 passed (27)" | subpath-imports "resolves every workspace specifier on it, and reaches past the entry's own imports" |
   | RV-C6 | survives, 81/81 | killed, 1 of 85 | "is the spec of every readArgv call, and no other module names readArgv" |
   | RV-P8 (equivalent) | survives, 52/52 | survives, "Tests  72 passed (72)" | none |

   Each target is killed by exactly one row, and that row is the one added for it. **All eight reproduce, and RV-P8 reproduces as a
   survivor at both commits.**

3. **My own mutants of the new code**, `tools/rev_specs.py`. It checks that each `old` occurs exactly once at the target commit
   (0 problems). Every mutant runs all four guard files (157 rows at head, 133 at base). 18 ran at head and 5 at base, and 2 control
   mutants and 10 fix checks followed. [Observed, `rev-head.log`, `rev-base.log`, `rev-head-controls.log`]

   | Id | What | Head `c90cd732` | Base `8ff50172` |
   |---|---|---|---|
   | R1 | `\.\.?(?:\/\|$)` → `\.\.(?:\/\|$)`: a `./x` version no longer local | **survives** 157/157 | n/a |
   | R2 | `\.\.?(?:\/\|$)` → `\.\.?\/`: `.` and `..` alone no longer local | **survives** 157/157 | n/a |
   | R3 | tarball arm `\.(?:tgz\|tar\|tar\.gz)$` → `\.tgz$` | **survives** 157/157 | n/a |
   | R4 | home-path arm `~\/` loosened to `~`: a `~1.2.3` registry range reads local | **survives** 157/157 | n/a |
   | R5 | tarball arm's `$` dropped | **survives** 157/157 | n/a |
   | R6 | root kept in the map as `{ dir: '.', name: root.name }`, without its dependency fields | **survives** 157/157 | n/a |
   | R7 | only the importing package's own manifest counts | killed, 1 row ("…a file: dependency of another package…") | n/a |
   | R8 | `git` added to the anchored arms | killed, 1 row ("…a git dependency outside the workspace") | n/a |
   | R9 | every version reads local (`/^\|(?:file:…`) | killed, "Tests  6 failed \| 151 passed (157)", including the registry range and registry version controls | n/a |
   | R10 | any bare name reads local once any local dependency exists | killed, 2 rows (the "name no local dependency declares" and "longer name" controls) | n/a |
   | C1 | the population's `/\.[cm]?tsx?$/u` loses its `$` | **survives** 157/157 | n/a |
   | C2 | `[cm]?` → `m?` (`.cts` left out) | killed, 1 row (the N3 row) | n/a |
   | C3 | the test exclusion no longer covers `.test.tsx` | killed, 1 row (the N3 row) | n/a |
   | C4 | the test exclusion loses its leading `\.` (`test\.`), so `latest.ts` is excluded | **survives** 157/157 | n/a |
   | S1 | the injected reader decides membership, but the parse re-reads the tree | killed, 2 rows (both new self rows) | n/a |
   | S2 | `recursive: true` dropped from the tree population | **survives** 157/157 | **survives** 133/133 (pre-existing) |
   | T1 | tree: root devDependency `"dossier": "./packages/polaris-dossier"`, imported by `main.ts` | killed, 2 rows (both guards' "resolves every") | survives 133/133 |
   | T2 | tree, **faithful**: `apps/syzygy` dependency `"remote-lib": "https://example.com/remote-lib-1.0.0.tgz"`, imported by `main.ts` | **killed**, 2 rows (both "resolves every") | survives 133/133 |
   | T3 | tree: root devDependency `"dossier": "packages/polaris-dossier/"` (npm: `directory`), imported by `main.ts` | **survives** 157/157 | survives 133/133 |
   | T4 | tree, **faithful**: root devDependency `"ts5": "npm:typescript@^5.5.0"`, imported by `main.ts` | **killed**, 2 rows (both "resolves every") | survives 133/133 |

   - Survivors at head: R1–R6, C1, C4, S2 and T3, which is 10 of 20. None is a target.
   - Named residuals among them: none. S2 is pre-existing. T3 is an unnamed residual (N3). R1–R6 and C1/C4 are new predicates with no
     row (N1, N4).
   - T2 is a faithful tree the head guards now refuse, prospectively (N2). T4 is the same for the bead-listed `npm:` form (N2).

4. **The fix rows proposed in N1 and N4, checked.** `tools/fix_specs.py` writes them, and `fix-head.json` holds the run. [Observed]
   - Alone, they pass: "FIX-alone survives 0 ['Tests  164 passed (164)']".
   - Beside each of R1, R2, R3, R4, R5, R6, C1, C4 and S2, each run is killed by the proposed row for that mutant.
     - R1 fails 2 rows, `./lib` and `.`.
     - R3 fails 2 rows, `.tar` and `.tar.gz`.
     - Every other run fails exactly 1 row.

5. **The faithful-tree sweep, by two methods each** (rule 2).
   - **Dependencies.**
     - Python `re` over `git ls-tree -r -z` and `git show` at `c90cd732` (`tools/sweep.py`, `sweep-head.json`): 11 tracked manifests
       (the root, 2 under `apps/`, 8 under `packages/`) and 20 dependencies. By field: `dependencies` 17, `devDependencies` 3,
       `optionalDependencies` 0, `peerDependencies` 0.
     - **0 of 20 match the local pattern.** 0 versions start with `~`, and 0 versions are non-numeric.
     - The second method, the PR's own JS regex in `node` over `git ls-files` manifests, gives "manifests 11 deps 20 local 0".
     - At main `546f1ff0`: 12 manifests and 24 dependencies, 21 under `dependencies` and 3 under `devDependencies`. 0 match.
   - **Module types.**
     - **0 `.mts`, `.cts` or `.tsx` modules exist under any `src`.** `git ls-tree` gives 498 files under `apps/*/src` and
       `packages/*/src`: 496 `.ts`, 1 `.json` and 1 `.mjs`. `find` over the same directories gives 498 files and 0 of those types.
     - 0 such modules are tracked anywhere in the repository. 246 of the 496 `.ts` files are non-test modules.
     - At main `546f1ff0`: 505 files and 0 of those types.
   - The tree has no `allowJs` and no `jsx` option (`tsconfig.base.json`, every package `tsconfig.json`), so no `.js` module compiles.

6. **The lane's record, checked by my own script against the git objects.** `tools/check_record.py` writes `check-record.json`:
   "problems 0".
   - For all 6 run records it checked the commit each names, that each result's edits equal its spec, and that each `old` occurs
     exactly once in its file at that commit. It also checked that each outcome agrees with its exit code, failed rows and Tests
     line, and that the tree was clean after.
   - Recomputed from the run records, not read from `summary.json`:
     - premise-base: 9 survive.
     - targets-head: 8 killed and 1 survives.
     - own-head: 36/36 killed.
     - own-base-tree: 9/9 survive.
     - retained: base 99 killed and 24 survive; head 107 killed and 16 survive. Of the 123, 114 are unchanged and 9 stronger (the 8
       targets and RV-P2, whose failing rows go from 6 to 7). 0 are weaker, and 0 head survivors are killed at base.
   - The digests:
     - `summary.json`'s subject sha256 is `615db956…`, which equals the code diff.
     - mut.py is `ca2b8ead…`, and the island diff tool is `13120684…`.
     - `record.py` is `6f1a80e4…` and `summary.json` is `641ea1d8…`, both as the PR body states.
   - The retained set is 41 + 3 + 7 + 79 = 130 rows, less 7 merged duplicates, which makes 123. It leaves out `fix-specs.json` (6 FIX
     specs) and the PR 524 reviewer's `filter-specs-base.json` (2 specs). 8.36's record discloses the second omission; nothing
     discloses the first (N6).
   - The lane's `record.py`: "summary.json matches ; problems: 0" with exit 0, and `--selftest` reports "selftest: 18/18 mutations make
     a check fail".

7. **Titles, re-derived.** I ran `npx vitest list --json` in clean clones of each commit and took the multiset difference over (relative
   path, name), in `titles.json`.
   - Base has 5,301 titles and head 5,325. 24 are added (20 in `workspace-reach.test.ts`, 4 in `argv.test.ts`) and 0 removed.
   - The duplicate keys are equal at both commits (3).
   - The added set equals the lane's `titles.json`. So `Tests: +24 ~0 -0` holds.

8. **Island differential**, the #528 lane's `island_diff.py` (sha256 `131206846b06…`, the same bytes), testkit at `8ff50172` against
   `c90cd732`. [Observed, `island-diff.json`]
   - Walks: "entries": 246 and "equal": 246, with answers sha256 `e297b289a9f722bdfe5840064f27e1454df131795eecb5b6c1546f30a1cae777`.
   - Resolver answers: 496 files and 2,612 specifiers, 2,612 equal. By answer: module 1,547, null 1,065, undefined 0.
   - Every field equals the lane's record except `scratchSha256`. That field differs as expected: the scratch test embeds the
     TMPDIR path of the answers file.
   - **The selftest fails, as it should.** The tool's own `--selftest` makes 186 of 246 walks and 1,286 of 2,612 answers differ.
   - **My two selftest variants of the new branch** (only `MUTANT` changed) also fail, as they should:
     - `island_diff_v_local.py` makes every version local: 107 of 246 walks and 256 of 2,612 answers differ, for example
       "…imports vitest: null -> undefined".
     - `island_diff_v_root.py` gives the root manifest a `typescript: 'file:x'` devDependency: 0 walks and 5 answers differ, all
       `typescript` imports in test modules.
   - So the differential sees the new N2 branch and the root read on today's tree.

9. **Repeats under the host's load.** [Observed, `repeat-runs.json`]
   - At `138010d5`, the four guard files ran 5 times, each "Tests  157 passed (157)" and "Test Files  4 passed (4)", at load1 75.7,
     78.1, 78.7, 80.6 and 80.9.
   - The whole `@syzygy/polaris-generation-core` and `@syzygy/polaris-dossier` projects ran 5 times. 2 runs passed ("Tests  2156
     passed | 1 skipped (2157)") and 3 failed, at load1 89.9, 70.9 and 53.4:
     - "Tests  1 failed | 2155 passed | 1 skipped (2157)";
     - "Tests  4 failed | 2152 passed | 1 skipped (2157)";
     - "Tests  3 failed | 2153 passed | 1 skipped (2157)".
   - Every failure is a ~5 s timeout in `start-gates.test.ts`, `review.test.ts`, `run-evidence.test.ts` or `git-object-reader.test.ts`.
   - Those four files ran 3 times at each commit, side by side, with Vitest reporting "Test timed out" at both commits (`flaky-*.json`).
     Base failed "9 failed | 221 passed (230)", "15 failed" and "4 failed"; head failed "8 failed", "23 failed" and "5 failed".
   - None of those files imports the testkit. This is outside the subject (N5).

10. **On the local merge `553d4837`** (`138010d5` onto main `546f1ff0`):
    - The four guard files ran 3 times, each "Tests  157 passed (157)" (`merge-guards.json`).
    - `island_diff.py` ran `546f1ff0` against `553d4837`: 251/251 walks and 2,627/2,627 answers equal over 503 files, with 0 undefined
      (`island-diff-merge.json`).

11. **Gates.**
    - `npm run typecheck` at `c90cd732`: exit 0, no diagnostics.
    - `python3 scripts/check_governance.py` at `138010d5`: "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted", exit 0.
    - `python3 scripts/check_quotations.py`: "OK    QC-1  a quotation beside a path:line locator was said by that file — 37 quotations
      examined in 18 of 948 .md files scanned (…), 0 findings", exit 0.
    - Hosted: `gh pr checks 531` gives "checks	pass	1m45s" and "node	pass	4m23s".
    - I did not re-run the 110-command battery. The lane's log line is "commit=138010d5beda4a1d39945265388fda0b35d34194 commands=110
      nonzero=0".

12. **Probes of the resolver itself**, by `node tools/resolve_probe.mts <testkit>` over a two-package workspace with the dependency
    `dossier: <version>`, at both commits (`resolve-probe-{base,head}.json`). Each pair reads base → head:
    - These go from null to **undefined**: `file:../../packages/lib`, `../../packages/lib`, `./lib`, `.`, `..`, `/srv/lib`, `~/lib`,
      `lib-0.0.0.tgz`, **`https://example.com/lib-1.0.0.tgz`**, **`http://example.com/lib.tar.gz`** and **`npm:typescript@^5.5.0`**.
    - These stay null → null: `git+https://…`, `github:someone/lib`, `.hidden-lib`, `C:/lib`, `a/b/c`, `~1.2.3` and `2.9.0`.
    - Bare specifiers: `''` goes from null to "throws TypeError: Cannot read properties of null (reading '0')" (from
      `/^(?:@[^/]+\/)?[^/]+/u.exec(specifier)![0]`, testkit `:89`). Node cannot load an empty specifier, so the throw fails closed and
      I record it as an observation, not a finding.
    - npm's own types (`npa-probe.json`): `https://…/x.tgz` is `remote`; `.hidden`, `.hidden/x`, `C:/x`, `a/b/c` and
      `packages/polaris-dossier/` are `directory`; `link:` and `workspace:` throw `EUNSUPPORTEDPROTOCOL`; `npm:typescript@5.9.2` is
      `alias`.

## 4. Findings

No blocking findings. Six notes.

### N1 — Five sub-forms of the local-version pattern, and the root manifest's dependencies, have no killing row (low)

- **Evidence.** [Observed] §3 items 3 and 4. Each of these passes all 157 rows of the four guard files at `c90cd732`:
  - **R1**, `./x` dropped;
  - **R2**, `.` or `..` alone dropped;
  - **R3**, `.tar` and `.tar.gz` dropped;
  - **R4**, `~/` loosened to `~`, which turns a `~1.2.3` registry range local;
  - **R5**, the tarball arm's end anchor dropped;
  - **R6**, the root manifest entry kept without its dependency fields.

  All six sit inside the flagged forms (a) and (b). The bead's own forms (`file:`, `link:`, `workspace:`, `npm:`) are each pinned:
  the lane's L11–L14 are killed.
  - The PR says "L11–L20, the version pattern: each alternative dropped". That is true of the top-level alternatives, not of the
    alternatives inside them.
  - The row "reads the workspace root's manifest beside the packages'" (`workspace-reach.test.ts:108-110`) asserts only
    `WORKSPACE.manifests.get('syzygy-workspace')?.dir` is `'.'`. Its title promises that the root manifest is read, so it is weaker
    than its title: it cannot tell a root entry with its declarations from one without them.
  - GP-Q0 `:65` asks for "a rule-6 mutant for each predicate".
- **Failure scenario.** A tidy of the testkit (8.5's import tidying is next) shortens the pattern or rebuilds the root entry by
  hand, and CI stays green. Later, `"dossier": "./packages/polaris-dossier"` in the root manifest reads as outside, and the daemon
  loads the barrel with both guards green.
- **Proposed fix**, checked in §3 item 4: 164/164 pass together, and each row kills its survivor.
  - In "reads a bare name declared as %s as naming no module", add these rows:
    - `['a ./ path dependency', 'dossier', { dependencies: { dossier: './lib' } }, {}]`
    - `['a dependency on its own directory', 'dossier', { dependencies: { dossier: '.' } }, {}]`
    - `['a .tar dependency', …'lib-0.0.0.tar'…]`
    - `['a .tar.gz dependency', …'lib-0.0.0.tar.gz'…]`
  - In "leaves a bare name declared as %s outside the workspace", add these controls:
    - `['a registry tilde range', 'dossier', { dependencies: { dossier: '~1.2.3' } }]`
    - `['a git dependency whose path holds .tgz', 'dossier', { dependencies: { dossier: 'git+https://example.com/lib.tgz.git' } }]`
  - Replace the root row's assertion with
    `expect(WORKSPACE.manifests.get('syzygy-workspace')).toEqual({ dir: '.', ...JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) })`.
    This derives the expected value independently of the testkit (bar 4) and needs `import { readFileSync } from 'node:fs'`.

### N2 — The tarball arm refuses a remote tarball URL, and the PR's residuals say it reads as outside (low)

- **Evidence.** [Observed]
  - The PR body, "Residuals": "A git dependency (`github:`, `git+file:`) or a remote tarball URL still reads as outside the
    workspace." The second half is false.
  - `\.(?:tgz|tar|tar\.gz)$` (testkit `:61`) matches `https://example.com/lib-1.0.0.tgz` and `http://example.com/lib.tar.gz`, and
    `resolveIn` answers **undefined** for both. At base the answer was null (§3 item 12).
  - npm types both `remote`, not `file`. They install from a URL, not a workspace directory.
  - Tree mutant T2 is faithful: a remote tarball dependency imported from `main.ts` names no workspace module. It passes 133/133 at
    base and is **killed** at head, failing both guards' "resolves every" rows.
  - Two related points:
    - **T4.** An `npm:` alias of a *registry* package (`"ts5": "npm:typescript@^5.5.0"`) is also refused at head. That is the bead's
      own listed form, so it is in scope, but no record names the refusal.
    - **The testkit comment at `:59-60`.** It says these versions install "not from the registry" and that "npm reads [a path or
      tarball name] as `file:`". npm installs an `npm:` alias from the registry. It does not install `link:` or `workspace:` at all:
      npa 12.0.2 throws `EUNSUPPORTEDPROTOCOL`. It reads a tarball URL as `remote`.
  - Today 0 of 20 dependencies (0 of 24 on main) take any of these forms, so no answer changes.
- **Failure scenario.** A later change adds a URL tarball or an `npm:` registry alias and imports it on the daemon path or the CLI
  walk. Both guards go red on a faithful tree. The author is told by the record that URLs read as outside, so they misdiagnose the
  failure, or loosen the guard to get past it.
- **Proposed fix.** One of these:
  - (i) Keep the refusal. Correct the residual in the dispositions record, and have the owner notice name both refusals: URL tarballs
    and `npm:` registry aliases. Fix the comment at `:59-60` as well.
  - (ii) Exclude URL-shaped versions from the tarball arm, and add an `https://…/x.tgz` row to the "leaves … outside" controls. One
    form of the pattern is
    `/^(?:file:|link:|workspace:|npm:|\.\.?(?:\/|$)|\/|~\/)|^(?![a-z][a-z0-9+.-]*:).*\.(?:tgz|tar|tar\.gz)$/iu`. I checked it in
    `node` over 12 strings:
    - local `lib-0.0.0.tgz`, `lib.tar`, `lib.tar.gz`, `../x.tgz`, `file:x.tgz`, `./x` and `~/x` stay true;
    - `https://…/x.tgz`, `http://…/x.tar.gz`, `git+https://…/lib.tgz.git`, `2.9.0` and `~1.2.3` are false.

    I did not run it against the guard files.

  Option (ii) narrows a refusal, which needs the same GP-Q0 ruling again, so I recommend (i).

### N3 — Unnamed residual: path versions npm reads as a directory without a leading `./`, `../`, `/` or `~/` (low)

- **Evidence.** [Observed]
  - npm types `packages/polaris-dossier/` (with its trailing slash), `.hidden-lib`, `C:/lib` and `a/b/c` as `directory`.
    `packages/polaris-dossier/` resolves to `<where>/packages/polaris-dossier`.
  - The resolver answers null for each, both before and after the change.
  - Tree mutant T3, the root devDependency `"dossier": "packages/polaris-dossier/"` imported by `main.ts`, survives at both commits
    (133/133, 157/157). That is N2 of the #528 review again, in a spelling the pattern misses.
  - The testkit comment claims "a path … which npm reads as `file:`". The PR's residuals name only git and URL forms.
  - [Inferred] These spellings are outside the forms npm documents for local paths (`../foo/bar`, `~/foo/bar`, `./foo/bar`,
    `/foo/bar`), which the pattern covers. They are also outside the bead's list. So this is a residual, not a defect of the bead's
    fix.
- **Failure scenario.** A root manifest declares `"dossier": "packages/polaris-dossier/"`, and npm links the workspace package under
  that name. An import of `dossier` on the daemon path then passes both guards.
- **Proposed fix.** Name the form in the residuals of the dispositions record and of 8.5's brief. Matching npm's own test instead
  (`^(?:[.]|~[/]|[/\\]|[a-zA-Z]:)`, plus a slashed spec that is not a hosted-git shorthand) widens a refusal, which would need the
  same ruling. Naming it is enough for now.

### N4 — The census population: two new sub-predicates without a row, and the tree's recursion unpinned before this change (low)

- **Evidence.** [Observed] §3 items 3 and 4.
  - **C1**, the extension test's `$` dropped (`argv.test.ts:192`), survives 157/157.
  - **C4**, the test exclusion's leading `\.` dropped, survives 157/157. That mutant leaves out every non-test module whose name ends
    in `test.ts`, such as `latest.ts`.
  - The N3 row's non-TypeScript files (`notes.md`, `fixture.json`) contain no `.ts`, and none of its modules ends in `test.ts`.
    The row's title says "every module … and no test module", so the row is weaker than its title.
  - **S2**, `recursive: true` dropped from `treeFiles()` (`:185`), survives at head 157/157 and at base 133/133, so it is
    pre-existing.
  - The two tree rows list only top-level modules. 28 nested non-test modules exist under `src`, and 0 of them name `readArgv`, so
    the mutant is equivalent on today's tree.
  - The PR moved this expression into `treeFiles()` and lists the population as a residual, but no row pins its depth.
- **Failure scenario.** A reader added in a subdirectory (for example `packages/polaris-dossier/src/commands/x.ts`) with its own spec.
  Or a module named like `latest.ts`, after a tidy that drops the recursion or the dot. Either way its accepted and refused forms
  change with CI green.
- **Proposed fix**, checked in §3 item 4:
  - Add `'latest.ts'` and `'notes.ts.md'` to the N3 row's files, and `'latest.ts'` to its expected calls.
  - Add the row `it('reads every src directory to its depth', () => { expect(treeFiles()).toContain('apps/three-surface-poc/src/polaris-generation/self-corpus.ts'); })`.

### N5 — Outside the subject: dossier-project tests time out under load at both commits (low)

- **Evidence.** [Observed] §3 item 9. In 3 of 5 whole-project runs at `138010d5`, 1, 4 or 3 tests failed.
  - Every failure is a ~5 s timeout in `start-gates.test.ts`, `review.test.ts`, `run-evidence.test.ts` or `git-object-reader.test.ts`.
  - The same four files time out at `8ff50172` and at `c90cd732` when run side by side.
  - None of them imports the testkit; its 3 importers are the guard tests.
  - Open beads already cover part of this. My sweep was `bd list --json` (read-only, 254 open beads), every field searched.
    - `syzygy-bpyt.4.33` and `syzygy-y3uc` cover start-gates.
    - `syzygy-bpyt.4.24` covers run-evidence and others, and records that `syzygy-bpyt.4.5` carries `git-object-reader.test.ts`'s
      30 s "reviewer's amplification shape" bound.
    - [Observed] 8 beads name `review.test` or `git-object-reader`, and I read each hit. None names the two timeouts I saw:
      `review.test.ts` "retires a counted verdict when the draft is revised…", and `git-object-reader.test.ts` "a delta chain one
      past the depth cap refuses…".
    - `syzygy-bpyt.4.26` names a different `review.test.ts:545` failure, a fixture leaf that matches a TMPDIR path.
- **Failure scenario.** Red runs on a loaded host train people to ignore red (bar 6), and they mask a real failure in the same projects.
- **Proposed fix.** None in this PR. Add those two rows to `syzygy-bpyt.4.24`'s scope, or file a sibling bead.

### N6 — Process: the owner notice is pending, and the retained-spec denominator is unstated (process)

- **Evidence.** [Observed]
  - The PR says "Owner notice: due on `syzygy-bpyt.10` at landing". That is not yet due, and it is not yet posted.
  - "This is all 123 specs the PR 524 and PR 528 reviewers retained". The gathered set leaves out the #528 reviewer's
    `fix-specs.json`, 6 fix-row checks that are not mutants of the code, and the #524 reviewer's `filter-specs-base.json`, 2 specs.
    8.36's `reviewer-specs.json` discloses the second omission; nothing discloses the first (rule 9: a denominator).
- **Failure scenario.** The owner reads the notice without the refusals in N2, or a later reader re-derives 123 from the reviewers'
  directories and finds 131.
- **Proposed fix.**
  - The owner notice for 8.37 names the refusals beyond the bead's literal list:
    - path versions;
    - local tarball names;
    - **remote tarball URLs**;
    - `npm:` aliases of registry packages;
    - the root manifest.
  - It says that each fails closed, in a test guard, with 0 of 20 dependencies affected.
  - The dispositions record states the retained set's denominator: 130 gathered rows, less 7 merged duplicates, which makes 123,
    with the 8 specs above excluded and the reason for each.

## 5. Every changed output, or the evidence that there is none

None. [Observed]
- **The subject.** The 3 code files are 2 test modules and the test-support testkit. The other 21 files are evidence under
  `docs/evidence/syzygy-bpyt-8-37/`.
- **No export reaches the testkit.**
  - It is imported only by 3 test files.
  - `@syzygy/polaris-generation-core` exports `.` and `./live`, and `@syzygy/polaris-dossier` exports `.`, `./argv` and
    `./state-directory`. The subject touches no manifest.
  - The packages' `include: ["src"]` with no `exclude` compiles test modules and the testkit into `dist/` too. This is
    pre-existing, and no export or entry reaches those outputs.
- **No product byte, wire format, refusal string or exit code changes** (GP-Q0 `:53`).
- **The guards' answers over today's tree are equal, old against new**: 246/246 walks and 2,612/2,612 answers. On the merge with main
  they are 251/251 and 2,627/2,627.

## 6. Verdict per acceptance criterion

1. "RV-P3, RV-P4, RV-P6, RV-Q1, RV-Q2 and RV-Q3 each survive at base and are killed at head, recorded with old/new fragments, commit and
   subject digest": **met.**
   - [Observed] I reproduced all six (§3 item 2).
   - The records carry each `old`/`new` and its commit. My check found each `old` exactly once at its commit.
   - `summary.json` names the subject digest `615db956…` (rule 11).
2. "RV-T18 (and a link:/workspace: variant) killed at head; RV-C6 killed at head": **met.**
   - [Observed] RV-T18 and RV-C6 are reproduced (§3 item 2).
   - The lane's `T18-link` and `T18-workspace` are killed at head and survive at base (own-head, own-base-tree, as I checked).
3. "Island walk answers unchanged over the tree (island_diff.py, 246/246 or the current population), no product byte; Tests delta and
   class stated (expected 1, 4 and 6 as for 8.34 and 8.36); independent review; GP-Q0 differential, mutants and owner notice": **met,
   except the owner notice, which is due at landing (N6).**
   - Walks are 246/246, and 251/251 on the merge. No product byte changes.
   - `Tests: +24 ~0 -0`, re-derived. The classes are stated, and I rule them 1, 4 and 6.
   - This review is the independent review.
   - The differential was reproduced, with its selftest and two variants failing as they should.
   - Mutants are recorded per predicate. The new predicates without a row are N1 and N4.

## 7. Test quality

- **Bar 4 (literals).** [Observed] Every new expected value is a literal (`toBeUndefined()`, `toBeNull()`, `'.'`, literal arrays and
  objects), or a literal list mapped through a template: the N3 row's four expected calls. None mirrors the implementation's filter
  or pattern.
- **Rule 6 (each row kills its predicate alone).**
  - [Observed] Each of the 8 targets is killed by exactly one row, the row added for it (§3 item 2).
  - Every one of the 24 added titles now fails under at least one recorded mutant. That includes the three controls that no lane
    mutant reached:
    - "a registry version" and "a registry range" fail under my R9;
    - "a name no local dependency declares" fails under my R10.
  - The new predicates without a row are listed in N1 and N4.
- **Rows weaker than their titles.** Two, both with fixes checked:
  - "reads the workspace root's manifest beside the packages'" pins only the entry's `dir`, so R6 survives (N1).
  - "reads every module TypeScript compiles under src, … and no test module" survives C1 and C4 (N4).
- **Bar 3 (failure paths).** The N2 block has five "leaves … outside" controls beside its eleven refusals. The tilde-range and
  URL-tarball controls are missing (N1, N2).
- **Bar 6 (determinism).**
  - The four guard files pass 5 of 5 times at load1 75.7–80.9, and 3 of 3 on the merge.
  - The whole-project timeouts are outside the subject and occur at both commits (N5).
- **Bar 10 (growth).**
  - +24, −0. Five of the rows extend existing `it.each` tables: the three `#` alias rows and the two census rows.
  - The N2 block is new because no table covered bare names. Each added row catches a mutant no earlier row catches, so the adds-only
    growth is governed.
- **The injected seam.** `readArgvCallers(files, read)` keeps its tree defaults, and the two tree rows call it with none.
  - [Observed] Their bodies are byte-unchanged (`git diff`).
  - S1, K1 and K2 show that the self rows go through the seam, not around it.

## 8. Cleanup

- I deleted every scratch clone: the head clone, the base clone, the evidence-head clone and the local merge `553d4837`. I also
  deleted every private TMPDIR. `ls /tmp | grep -c r531` gives 0.
- I touched nothing outside `rev-531/`, never pushed, commented or merged, and killed no process.
- I kept no file over 300 KB. I deleted the two full `vitest list` outputs (about 2 MB each); `titles.json` keeps their sha256 and
  the difference.

Kept tools, under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-531/tools/`:

| File | sha256 |
|---|---|
| `mut.py` (the #524 reviewer's, unchanged) | `ca2b8eadc503305bb3767b7220b02775429164ef6c183ac9854acf9d8ed9b6a5` |
| `island_diff.py` (the 8.36 lane's, unchanged) | `131206846b062bc60ba7efeb67bf6ecf81802a54921d94979f2bc7428b8afc04` |
| `island_diff_v_local.py` | `1d1cb23d574c798d84f2266419219021aca265ee00d7eb1f3d247e0bc031332d` |
| `island_diff_v_root.py` | `ba254a3b7af235a9e484d9bdc2cf5fd9de2e5c7c25bbf417b1a6f8edda4b308b` |
| `targets-specs.json` | `17a59495adb24eb5673c76fe93eefb86d42b737bb966a5f28ef3cc0278b4f512` |
| `rev_specs.py` | `7814b9aa2e19e97d14f41ecafb1acb8335dacdf2521f245ce8a6fe2f237a7e58` |
| `fix_specs.py` | `354cb63b9fb5fc57baaf3be8263a8409bbc6bb5ad665f17e7bdc8132ba2e4e4b` |
| `check_record.py` | `835b6da721c7aad85aa2973402701c039f0db6cceac513c8f77fd9b1b5df5073` |
| `sweep.py` | `aac630a36a314aeefe73408210a0007218f22ef646c817bc76a50a0efe3156b8` |
| `npa_probe.cjs` | `3eafd6baf16024eadd690be9c5b6a8b21a7243d51014ca53f0b3e6d7d68efc9c` |
| `resolve_probe.mts` | `b029aa4c9c84aa2899319e286ef0bcc68d8001543aeb76023893cbc98cb2d788` |
| `repeat.py` | `97a84167348891683105d9acf110d8c4839435f616f4406e2acd3e3e3245af6d` |
| `repeat_files.py` | `ba607e98e9f06bf6de90d9a1f7ad4c16099db63db37831b49280d96a58fa12f0` |

Kept results, in `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-531/`:

| File | sha256 |
|---|---|
| `targets-base.json` | `e34590a61dd793891acac7692f8ac56fb1f74e7f29d6df9ea9939debb6746593` |
| `targets-base.log` | `806956ab1c77069c0e2b27f642820e049c18bd887d4101268d9f0e2183badb0d` |
| `targets-head.json` | `43050dd396985c944b0f2f2c8af206a321b00e08acc6a0a613fda4539c3eb121` |
| `targets-head.log` | `aebd98e1302b53a300789b302037e1377a210976da96555bde523c056963a08d` |
| `rev-specs-head.json` | `75e48a1b998d817b76f463667848c7e51b7f57a255ff3801d1b4cb52878b2aaa` |
| `rev-specs-base.json` | `e0e91972b0e752f5f54e7d4d63d3eed8db744943e39407e45bfc0a3d7451ee13` |
| `rev-specs-head-controls.json` | `2ec54c0badb6293566ebb5fc58688549ca42a2b97044333b3a9edbfc5c6df9e1` |
| `rev-head.json` | `bafdaf818aed1a636bce27c22a25086d632e937d23221439668a3b4be3866e8b` |
| `rev-head.log` | `ff53c9b8ba4e9dc9d6f79c33900f7099533e9ab46483549377fcae95ba44a6f3` |
| `rev-base.json` | `009fae89f1cce877bc3b7cdd3f3688161ca2e1fba5307bb88acae08d73fe84e7` |
| `rev-base.log` | `31b43c861aa24a7c1ebebe70eb0b5be12ec467c564b3c4e73abab4fe550ff701` |
| `rev-head-controls.json` | `a32284ef331bf895ba053582cb5811b3adb32f8863ad3c25856a007a4741b2dc` |
| `rev-head-controls.log` | `5c4755f5f828e497d9e0ed189fb6862879cf52d15474cb95d00b89fdcfc2862c` |
| `fix-specs.json` | `21cdd65dce157264bd58a612d1ecbae090232ff1299c03a23674fce8852f7b83` |
| `fix-head.json` | `d77d737d5ab8c857d3476aff1fc3317e0a9eb438541e748ed7ce1e4ea1c66b20` |
| `fix-head.log` | `f13f65272ee94051ed58d9c11fee0ec9eba4da6671d3cd02504760d498fd2049` |
| `sweep-head.json` | `a00ec809b50e3931ba708fed8510314d03af89ec96a639c48cb9e6791d79adf4` |
| `sweep-main-546f1ff0.json` | `e5038f3f180ec4be8f1618050288c2d99a161c70104d946c007b16cc5d426236` |
| `npa-probe.json` | `68f30f99b867b256091ffd30fffbe3a86adf9670862fa036033a041c5d2ba8ec` |
| `resolve-probe-base.json` | `4ecf99c51325983e1a02bbea31fdacf526b7c78a7190f4033fe84062a45dedd0` |
| `resolve-probe-head.json` | `71ca1a81aecca69dfacf0e7d921db8f3b9af29f3badd51906a83e491c0d499dd` |
| `check-record.json` | `fdcbd16a633cba59568b1b6177a12007d66fe23c7ba630f351e669079f944660` |
| `record-selftest.log` | `bfb7a6cafbc4c4c4a75e90ee6439b4b46fe86ba30a248058f3403be54df31500` |
| `titles.json` | `55c671eb5b253993e52836a39668f0a0cccc681852445bfdc9499390a4c409a2` |
| `island-diff.json` | `b9a48300542980f864103523a5efb345417e8df301fe7e70db8a29ee1a0caa8d` |
| `island-diff.log` | `d363ea67b7a13adb6c295f6c0315c19317ac900684569a0dd49ff48ca190cf9d` |
| `island-diff-selftest.json` | `f24e2235dfefccc0402c88fc83c3c7b38bd928f23d431dcead134b126299f1e1` |
| `island-diff-selftest.log` | `c2e2ffdb3e5aea732775e96f817c68bef0972042574a7572ff49eee09c5c8c5d` |
| `island-diff-selftest-v_local.json` | `f7dd080209da688825102a15689e1f2ccb7ccc995c63ee35b73f1a513d4e20e0` |
| `island-diff-selftest-v_local.log` | `0414e0bee2385980e96460b737921042d3ae371753b82e459753b941b318157e` |
| `island-diff-selftest-v_root.json` | `e6dc95e133fad8babbb9574235cf1a702e38604b7b5d7f6e8ef258d3fdafcbfe` |
| `island-diff-selftest-v_root.log` | `393b3ff35c7c6103440f01700a6b44b132d45a2308721917224277dfaa66ac37` |
| `island-diff-merge.json` | `8d1d6fd904237c16cd0bbe28b1bc32fca72d2cbbbdf31c0b4863b04f6ae4f57e` |
| `island-diff-merge.log` | `ed5b4749e20161d6a43315ee6721cd5095e5d9ae27a2ee1ea9b9742fdf55b592` |
| `merge-guards.json` | `ab1ea7ffddff151ad58243128c3c4f8f0c2850126f856afe3a3e33b9c7dcfe8d` |
| `repeat-runs.json` | `0817cb9218a00d8b8c6e72872a3166e952580f83190c9585b1922b11c55512d3` |
| `repeat-runs.log` | `208179a44c2b2a4618f709f72e32f22c4b5f36637eaff8828647117a985e58fd` |
| `flaky-base.json` | `12da24497182d727a73b09355f7374bbe15dc504022d4e50ba1e5af617529ed1` |
| `flaky-base.log` | `04ab25693b58bb4fb9f18553be25dff4cd0d731a874d61bfb3bd49e3a52c180c` |
| `flaky-head.json` | `9200facdbf059398571202191a7f416207ea107f6e061e4429936d1226498836` |
| `flaky-head.log` | `180c2b8206a3c0fdc13536aa025364d86ab970b3a760b22dd1d899f61e6fb6df` |
| `main-moved.json` | `85814d72a50ca31ffb7b0d563471b83fee53ace0c85b8e8ec3fd08e50bc71637` |
| `typecheck.log` | `e2c8b37ba8c2974699631485e9c24406b9eb7c793bbbd178345cd4a0f86ce13f` |
| `check-governance.log` | `aececfcd952cf701b39ca432c14b01849a63b58d6dd3ba894d7652513c1b5c91` |
| `check-quotations.log` | `9263aaccbc5e85b3f15ecdce7aa1ec184c9f7b0df1b7120e3852f997e54f071f` |
| `pr-body-live.md` (the PR body as read) | `78f6e957efee412a86d740aeca1e7227caf97d5050f57261fa8d68a135e1fc9d` |
