# R-GP-IMPL-OBSERVER-SUPPORT-1 — CC-REV-1 implementation review of syzygy-bpyt.6.15, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 6ef18990
Subject: r1-review.diff sha256 c6cd844feec49fb585f2235de362b18728020276ab690e5c432b6c55ffa6b393

Reviewer: independent fresh-context CC-REV-1 reviewer (rev-540), 2026-10-27. I did not author the change and changed no
byte of it. PR #540, branch `agent/syzygy-bpyt.6.15`; base `bb05df7ea409039c5a6465e7179f9d0c66931ad3`; code commit
`f207d758eb11830eda2831caa911011e84a966b7`; evidence commit `6ef18990d3704a4f16588966a6620fb47cd0f3f9`. No Butlers or other
observed repository was read; no file under `~/.claude/`, `~/.config/` or a token store was opened.

## 1. Subject identity checks

All by script in a scratch clone of `/home/tze/GitHub/syzygy` with the branch and `main` fetched from GitHub.

| Check | Result |
|---|---|
| `git diff bb05df7e 6ef18990 \| sha256sum` | `c6cd844feec49fb585f2235de362b18728020276ab690e5c432b6c55ffa6b393` — **matches**; `cmp` with the brief's `r1-review.diff`: identical [Observed] |
| its shortstat | `27 files changed, 2321 insertions(+)` [Observed] |
| `git diff bb05df7e f207d758 \| sha256sum` | `a527579c89d53a6c38af519261fd4f6d918dbb1a27fdb9420db61dba3dd082fa` — **matches**; `2 files changed, 36 insertions(+)` [Observed] |
| ancestry | `6ef18990^` = `f207d758`, `f207d758^` = `bb05df7e`, `merge-base bb05df7e 6ef18990` = `bb05df7e`; `f207d758..6ef18990` touches only `docs/evidence/syzygy-bpyt-6-15/` (25 files) and no `apps/` or `packages/` byte [Observed, `tools/check_record.py`] |
| `summary.json` at `6ef18990` | sha256 `087df118f7e38266b3b8a35d974b72dddcb6bdd1635d50333411e7da01edec4b` — matches the brief [Observed] |
| subject file digests in `summary.json` | `git-observation.test.ts` `9f10eee7…`, `git-observation.ts` `993783b1…`, each equal to `git show f207d758:<path>` and `6ef18990:<path>` [Observed] |
| lane tool digests (`toolsSha256`, `runnerSha256`, gate-diff `toolSha256`) | all six tools, `rev535_mut.py` (`fe8ae4e5…`) and `gate-diff.mjs` (`f27ab213…`) equal their blobs at `6ef18990`; runner, gate-diff tool and both rev535 spec files are byte-identical at `bb05df7e` and `6ef18990` [Observed] |
| PR state | `gh pr view 540`: head `6ef18990d370…`, `OPEN`, `MERGEABLE` [Observed] |
| hosted CI | `gh pr checks 540`: `checks pass 24m29s`, `node pass 4m42s`; check-runs API: both `completed success` with `head_sha 6ef18990d3704a4f16588966a6620fb47cd0f3f9` [Observed]. `node-ci.yml:112` runs `npm test`. |
| main has moved | GitHub `main` = `d38d7a3ce632a34c2a41bdb77ad323ba0b05b777` (#487); `merge-base 6ef18990 d38d7a3c` = `bb05df7e` [Observed] |
| trial merge | `git merge --no-ff d38d7a3c` onto `6ef18990`: clean, merge `3c631e0c`. Shared paths between the PR's 27 and main's 87 since `bb05df7e`: **0** (`comm -12`). Main's only `apps/`/`packages/` change is `apps/three-surface-poc/src/polaris-authority-sweep.test.ts`; `git diff --name-only bb05df7e 3c631e0c -- packages/` is empty [Observed] |

Both digests match; the lane's "clean trial merge with no shared path" is confirmed.

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`):
- l.31–32: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- l.35–36: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
- l.37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- l.45–46: "**Class membership is contested by default and is never finally determined by the agent performing the change**"; l.51:
  "**A reviewer or the owner** may reclassify at any time."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
- Part 1, l.52–55: "\"Behavior-preserving\" means none of the following changes: … a rendered byte, a wire format, a refusal string or
  an exit code; … a consent, security or retention decision."
- Part 1, l.62–66: "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or
  class 4 (security) … an old-versus-new differential over a mutated-record corpus that includes records with altered prose; a
  rule-6 mutant for each predicate; a non-blocking owner notice in the cycle report."
- Stop clause, l.95–96: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**AGENTS.md at `6ef18990`**, verification rules: 6 (l.126) "Mutate the input and confirm the check fails, per predicate, before
trusting it"; 9 (l.132) "A claim of absence needs a sweep with a denominator."; 11 (l.134) "An evidence record names its subject
and the subject's digest".

**Test-rigor bar** (`git show 6ef18990:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`): l.42 "**A test is worth
keeping only if some plausible bug makes it fail.**"; l.58–59 "**Every bugfix ships a regression test** — Written to fail on
pre-fix code."; l.60–61 "**Edge and failure paths are first-class** — Empty inputs, boundaries, invalid states, error branches";
l.64–67 "**No tautologies** … Expected values are literals or independently derived."; l.82 "**A failure names the defect**";
l.93–95 "**Growth is governed** — A test is worth *adding* only if it catches a plausible bug no existing test catches".

**Class ruling (mine).**
- **Class 3: touched.** The gate decides whether the evaluation snapshot's `observer:${capture.observerRevision}` component
  (`apps/three-surface-poc/src/production-reobserve.ts:88`) honestly names the code the daemon runs. That is "snapshot
  composition, evaluation identity" [Observed: the snapshot string; the gate runs before every capture, `poc-main.ts:133-138`].
- **Class 4: touched.** The protected inputs include the code that enforces consent and the P1 body-read authority gate
  (`packages/three-surface-poc-core/src/body-read-authority.ts`, in the closure) and the host's credential handling
  (`packages/http-host/src/credentials.ts`). The gate's refusal decides whether that code may run dirty under a clean claim, a
  security decision in GP-Q0's own words ("a consent, security or retention decision") [Inferred].
- **Class 1: touched indirectly.** The gate is not a write-universe or typed-authority table, but it guards the integrity of the
  authority gate's bytes. I accept the lane's declaration; it adds no check that classes 3 and 4 do not already require.
- **Classes 2, 5, 6, 7: not touched.** No identity, migration, endpoint shape or certificate change. Re-observation's response
  changes for a dirty-support input (N4), but no route, method or envelope changes, so it is not a class-6 removal.
- The three GP-Q0 checks therefore apply: differential (§3.4), a rule-6 mutant per predicate (§3.3), owner notice (N4, N5).

**GP-Q0 ruling (mine): nothing a gate accepts or refuses changes beyond the restoration.** The change is not behaviour-preserving in
Part 1's sense (a dirty `packages/support/` path now yields exit 1 at startup and a refusal on re-observation), and bead 6.15 is
not in Part 3's table. It is lawful only as the coordinator's restoration ruling, whose premise I confirm in full:
- [Observed] Before #530 (`f7477f52^1` = `e5080f4d`) the daemon closure is 103 modules in 4 packages, by two methods (Node's own
  loader and esbuild, `closure-independent-pre530.json`), and **0** of its 111 inputs lie outside the five pre-#530 prefixes.
- [Observed] #530 changed 18 of those 103 modules; 16 lost a `createHash(`/`deepFreeze` implementation line (for example
  `three-surface-poc-core/src/act-fields.ts` lost `export function sha256` and `deepFreeze`, `apps/three-surface-poc/src/
  polaris-narrative.ts` lost `function deepFreeze`); all 18 sit under a pre-#530 prefix (`tools/restoration.py`). This upgrades
  the #535 review's "[Inferred, from PR 530's commit subject] The same holds for its other call sites" to Observed.
- [Observed] The head gate decides every path tracked at `e5080f4d` exactly as the `e5080f4d` gate does: `gate_diff.py` over
  `e5080f4d` against `f207d758` gives 9 differing paths, and none of the 9 is tracked at `e5080f4d` (`gate-diff-pre530-vs-head.json`).
- [Observed] Base against head: exactly 9 differing decisions over 5,598 paths, all under `packages/support/`, all accepted →
  refused (8 tracked files plus the probe `packages/support/src/new.ts`); refusals 319 → 328.
- [Observed] The code diff to the gate is one prefix line and one comment line; `packages/cap1-daemon/` stays and no
  `polaris-generation-*` prefix is added (`record.py`'s `GATE_ADDED` check, and my reading of the diff).
- The three refused test files (`sha256.test.ts`, `deep-freeze.test.ts`, `support-purity.test.ts`) follow the whole-package
  prefix every other entry already has; #529's ruled-in set also included test files (`docs/reviews/R-GP-IMPL-HTTP-HOST-1-RAW.md`
  l.120 lists `src/package.test.ts` and `src/shutdown.test.ts`) [Observed].

## 3. What I ran, and the results

Clones under `rev-540/`: `clone` (6ef18990), `code` (f207d758), `base` (bb05df7e), `pre530` (e5080f4d), `merge` (3c631e0c,
the trial merge); `npm ci` in each, the last after the merge. Every suite ran with a private TMPDIR under `/tmp/r540-<n>`.
Host: 12 cores, load average 42–84 throughout (other sessions).

### 3.1 Build, typecheck, governance

| Command | Head (6ef18990) | Merge (3c631e0c) |
|---|---|---|
| `npm run build` | `build exit=0` | `build exit=0` |
| `npm run typecheck` | `typecheck exit=0` | `typecheck exit=0` |
| `python3 scripts/check_governance.py` | `32 OK, 21 WARN, 0 FAIL (53 checks)`, exit 0 | `32 OK, 21 WARN, 0 FAIL (53 checks)`, exit 0 |
| `python3 scripts/check_quotations.py` | `OK    QC-1 … 37 quotations examined in 18 of 954 .md files scanned … 0 findings`, exit 0 | same, `18 of 971 .md files`, exit 0 |
| `record.py <tree> --check` | `summary.json matches ; problems: 0` | `summary.json matches ; problems: 0` |
| `record.py <tree> --selftest` | `selftest: 29/29 mutations make a check fail` | — |

`check_governance.py` at base gives the same 53 check lines; the only differing line is CG-2a's population, `2614 files examined`
→ `2619` [Observed, `diff` of the OK/WARN/FAIL lines].

### 3.2 The full vitest suite

| Run | Result | Failures |
|---|---|---|
| head, default workers | `Tests  1 failed \| 5375 passed \| 5 skipped (5381)` | 1: `polaris-dossier/src/start-gates.test.ts`, `Test timed out in 5000ms` |
| merge #1, default | `Tests  1 failed \| 5310 passed \| 70 skipped (5381)` | `polaris-generation-consent/src/act-families.test.ts` `Hook timed out in 10000ms` (its 65 tests skipped); `polaris-dossier/src/gate-acts.test.ts` `Test timed out in 5000ms` |
| merge #2, default | `Tests  5 failed \| 5306 passed \| 70 skipped (5381)` | the same hook timeout; 5 `Test timed out in 5000ms` in `gate-acts.test.ts` and `start-gates.test.ts` |
| merge #3, `--maxWorkers=3` | `Tests  8 failed \| 5368 passed \| 5 skipped (5381)` | 8 `Test timed out in 5000ms`: `gate-acts` 3, `screen.test.ts` 2, `start-gates` 2, `apps/three-surface-poc/src/polaris-presentation-route.test.ts` 1 |
| merge #4, default | `Tests  1 failed \| 5310 passed \| 70 skipped (5381)` | `act-families.test.ts` `Hook timed out in 10000ms`; `start-gates.test.ts` `Test timed out in 5000ms` |
| **base** (`bb05df7e`), default, after `npm run build` | `Tests  2 failed \| 5372 passed \| 5 skipped (5379)` | `gate-acts.test.ts` and `start-gates.test.ts`, each `Test timed out in 5000ms`: the same files and the same failure without this PR |

Every failure in every run is a 5 s test timeout or a 10 s hook timeout [Observed: each `FAIL` block in the logs]. Attribution:
- [Observed] Every failing file is byte-identical at base, head, main and the merge: the merge differs from base under `apps/`
  and `packages/` in exactly `git-observation.ts`, `git-observation.test.ts` and `polaris-authority-sweep.test.ts`, and none
  of the failing files imports `git-observation` (its importers are `launcher.ts`, `poc-main.ts`, `production-reobserve.ts`,
  `reobserve-session.ts` and three tests).
- [Observed] Run alone, the union of failing files passes: `Test Files  5 passed (5)`, `Tests  414 passed (414)` at the merge
  **and** at base; `start-gates.test.ts` alone at head, `104 passed (104)`; `act-families` and `gate-acts` alone at the merge
  after merge #1, `198 passed (198)`.
- [Observed] In every head and merge run the two new rows pass. The POC project is `1138` total, `1136` passed, `0` failed, `2` skipped in
  every run but merge #3, where one POC test (`polaris-presentation-route.test.ts`, a 5 s timeout) failed and passes alone.
- [Observed] Hosted `node` (which runs `npm test`) passes at `6ef18990`, and both hosted checks pass at `d38d7a3c`.
- [Observed] The base run, with no byte of this PR, fails the same way in the same two files.
- I rule these host-load timeouts, not a suite failure of the subject, so they do not trigger the verdict rule's full-suite
  clause. No fully green local run was obtained on this host at load average 42–84; the hosted run is the green full suite.

### 3.3 Mutants (rule 6)

All run with the PR 535 reviewer's runner, unchanged (`rev535_mut.py`, sha256 `fe8ae4e5…`), in the `code` clone (f207d758) or the
`base` clone, over `git-observation.test.ts` (13 tests at head, 11 at base) unless the spec names more. A mutant is killed iff
exit ≠ 0 and ≥ 1 failed test. `cleanAfter` was true for every run, and no failure was a timeout.

**Reproduction of the lane's record** (`tools/compare_mutants.py`): all 12 rows equal the committed records in commit, edits,
outcome, exit, failed rows and total tests, `differing: 0`.

| Mutant | Where | Outcome | Killing rows (line of the failing assertion) |
|---|---|---|---|
| V12 http-host → `src/` + `package.json` | base | survived, 0/580 | — |
| V12 | head | killed, 2/582 | table (135), guard (152) |
| V14 cap1-daemon → `src/` | base | survived, 0/35 | — |
| V14 | head | killed, 1/37 | table only |
| V15 three-surface-poc-core → `src/` | base | survived, 0/35 | — |
| V15 | head | killed, 2/37 | table, guard |
| O1 support prefix dropped | head | killed, 2/13 | table (135), guard (152) |
| O2 support → `src/` | head | killed, 2/13 | table, guard |
| O3 static import of `polaris-generation-core` | head | killed, 1/13 | guard (152), 27 unprotected inputs |
| O4 dynamic import of `polaris-generation-consent/live` in the core barrel | head | killed, 1/13 | guard (152), 8 |
| O5 `import '@syzygy/no-such-package'` | head | killed, 1/13 | guard, unresolved arm (147) |
| O6 cap1-daemon prefix dropped | head | killed, 2/13 | old row (112), table (135); not the guard |

**My own mutants** (`rev540-specs*.json`, built by `tools/make_specs*.py`):

| Mutant | Outcome | By | Reading |
|---|---|---|---|
| E1 `import type { GenerationSource } from '@syzygy/polaris-generation-core'` in `poc-main.ts` | killed | guard (152) | type-only edge followed |
| E2 `export type { … } from '@syzygy/polaris-generation-core'` | killed | guard | type-only re-export followed |
| E3 `export * from '@syzygy/polaris-dossier'` in `cap1-core/src/index.ts` | killed | guard, 68 | transitive, deep in the closure |
| E4 `import '@syzygy/polaris-generation-core/live'` | killed | guard | subpath export followed |
| E5 `import '../../../packages/polaris-dossier/src/index.js'` | killed | guard | relative cross-package edge |
| E6 `import '../../../scripts/measure_cli_island_loads.mjs'` | killed | guard, 3 | non-package file (the `?? module` arm) |
| E7 ``import(`@syzygy/polaris-generation-core/live`)`` in the core barrel | killed | guard | no-substitution template literal |
| E8 `const liveName = '…'; import(liveName)` in the core barrel | **survived** | — | N1 |
| E9 `createRequire(import.meta.url)('@syzygy/polaris-generation-core')` | **survived** | — | N1 |
| E10 `/// <reference path=…polaris-dossier/src/index.ts />` | survived | — | types only, never loaded at runtime; not a runtime input |
| E11 `"@syzygy/polaris-dossier": "0.0.0"` added to the POC manifest, no import | **survived** | — | by design of the derivation; N6 |
| G1 `'packages/support'` (no trailing slash) | **survived** | — | N3 |
| G2 `'packages/Support/'` | killed | table, guard | |
| G3 `package-lock.json` dropped from `exactInputs` | **survived** (also at base) | — | N2, pre-existing |
| G4 `tsconfig.base.json` dropped from `exactInputs` | **survived** (also at base) | — | N2, pre-existing |
| G5 cap1-daemon → `src/` + `package.json` | killed | table only (`packages/cap1-daemon/tsconfig.json`) | the table's tsconfig column is load-bearing |
| G6 `'packages/http-host'` (no slash), at base | survived | — | N3 predates the PR |
| T1 table narrowed to `package.json` alone + G5 | survived | — | with the tsconfig column gone, G5 survives: G5 is that column's killing mutant |
| T2 table narrowed to `package.json` alone + http-host → `src/` + manifest | killed | guard (`packages/http-host/tsconfig.json`) | the guard's package-file column works where the table is weakened |
| T3 guard inputs = modules only + the same http-host narrowing | killed | table | |
| T4 guard inputs = reached modules only (the guard reading only `src/`), alone | survived | — | equivalent on today's tree: every closure package is in the table |
| T5 `preProcessFile(…, true, false)` + O4's dynamic import | killed | guard | the third argument is not what follows TS `import()`; equivalent |
| T6 guard's `unresolved` assertion deleted + O5's import | survived | — | so O5 is that assertion's killing mutant |
| T7 the `toContain('packages/support/src/sha256.ts')` line deleted + O1 | killed | table, guard (151) | |
| T8 guard walk follows no edge (`([] as string[])`) | killed | guard, `toContain` (148) | the `toContain` line's killing mutant |
| T9 guard skips type-only edges, alone / + E1 | survived / survived | — | N7 |
| T10 guard skips dynamic edges, alone / + O4 / + E1 | survived / survived / killed | — / — / guard | N7; the filter is specific (E1 still kills) |
| CONTROL | survived, 0/13 | — | |

Each of the guard's three assertions has a killing mutant: l.147 (O5), l.148 (T8), l.152 (O1–O4, E1–E7). The new prefix has three
(O1, O2, G2). The table's `tsconfig.json` column has one of its own (G5, with T1 as its control).

### 3.4 The differential

- Re-run of the lane's `gate_diff.py` (unchanged) over `base` (bb05df7e) and `code` (f207d758), each side from its own `build:poc`:
  `paths 5598`, `refused {'base': 319, 'head': 328}`, `onlySupportDiffers True`, `everySupportPathDiffers True`; the output is
  JSON-equal to the committed `gate-diff.json` [Observed]. `tools/check_record.py` re-derives the 5,598 paths and their digest
  `06ffe323…` from the two trees and the probes.
- Rule 6 on it (`tools/mutate_differential.py`: mutate the head side's built `dist/git-observation.js`, which is ignored, re-run
  the tool, restore):

  | Mutation of the head gate | refused (base, head) | differing | `onlySupportDiffers` | `everySupportPathDiffers` |
  |---|---|---|---|---|
  | D0 control | 319, 328 | 9 | True | True |
  | D1 extra prefix `packages/polaris-generation-core/` | 319, 380 | 61 | **False** | **False** |
  | D2 support prefix dropped | 319, 319 | 0 | **False** | **False** |
  | D3 support prefix without the trailing slash | 319, 331 | 12 | **False** | **False** |

- The boundary probes are the right ones for this predicate: D3 flips exactly the three slash-boundary probes
  (`packages/support`, `packages/supportive/x.ts`, `packages/support-x/src/a.ts`) on top of the nine.
- The corpus is a path corpus. GP-Q0's "records with altered prose" has no analog for a predicate over paths; completeness holds
  analytically instead, as in #529: appending one `!startsWith` conjunct to an `every` can flip only paths under that prefix,
  and only accepted → refused.
- Pre-#530 against head: see §2 (0 of the 9 differing paths tracked at `e5080f4d`).

### 3.5 The derivation (the main judgement)

**Ruling: the daemon entry's import graph is the right population for this guard, and the lane's [Inferred] claim holds.**
- *What the gate protects, and where it runs.* `pocObserverInputsAreClean` has one production call, `observeCheckouts` in
  `poc-main.ts:133-138`, used at startup (l.154, error `observer-checkout-dirty`, printed as `POC runtime inputs have uncommitted changes`) and on every
  re-observation (l.183, refusal `POC runtime inputs are dirty; re-observation was refused`). `main` in `poc-main.ts` is reached only from `main.ts` (importers of
  `poc-main`: `main.ts`, `main.test.ts`, `watch-mode.test.ts`) [Observed]. No other entry (the `poc:dossier`,
  `poc:generator-demo`, … commands; `apps/syzygy`) imports `poc-main` or the gate (`git grep pocObserverInputsAreClean`:
  `git-observation.ts`, `poc-main.ts`, tests and evidence tools only) [Observed].
- *What the daemon process loads.* Node itself, `node --import tools/load-hook.mjs apps/three-surface-poc/dist/main.js --help`,
  loads 106 workspace modules (plus 72 `node_modules/yaml` files and 8 `node:` builtins) at head and at the merge; esbuild's
  resolver over the same entry reaches the same 106; both give exactly `apps/three-surface-poc`, `cap1-core`, `http-host`,
  `support` and `three-surface-poc-core`, 116 inputs, matching the lane's walk (`closure-independent-*.json`) [Observed]. At base
  the built gate accepts 5 of the 116 (support's `deep-freeze.ts`, `index.ts`, `sha256.ts`, `package.json`, `tsconfig.json`); at
  head and at the merge, 0 [Observed].
- *Nothing outside that graph is loaded or read.* In the 106 modules: 0 `import(`, 0 `createRequire`, 0 `require(` [Observed,
  grep over the 106]. Their child processes are `git` and `bd` only. Their reads of the observer checkout go through git objects
  at the observer revision (`governanceRevision: capture.observerRevision`, `production-reobserve.ts:102` and `:122`, into
  `gitTreeReaders`); other `readFileSync` calls read the state directory or the target repository [Inferred, from reading each
  fs call in the 106]. So routes and actions load nothing from `polaris-generation-*`.
- *Build inputs.* `tsconfig.base.json` sets `"isolatedModules": true`, so a closure module's emitted JS depends on its own source
  and compiler options only. A dirty `polaris-generation-*` file can fail `build:poc` (a refusal by failure), but cannot change
  what the daemon runs [Inferred].
- `build:poc`'s list and the manifest closure are therefore over-approximations. Using either would have forced prefixes for
  `polaris-generation-core` (dependency since `cb0614af`, 2026-09-13) and `polaris-generation-consent` (since `758f38c3`,
  2026-10-08), neither of which has ever had one (the prefix list dates from `f0de29bd`, 2026-08-29) [Observed, `git log -S`].
  That would be an unlisted tightening under the stop clause.
- *The bead's rule-6 requirement in import form:* "a fake new workspace dependency with no prefix must fail" is met for every import
  edge kind (O3, O4, E1–E7, all killed). As a manifest dependency with no import (E11), it passes the guard, by design (N6).

### 3.6 The record and the PR body, claim by claim

`tools/check_record.py` reads every value from the committed blobs at `6ef18990` (`git show`), never from a working tree:
`132 ok, 0 problems`. It checks the following:
- the commits, base and both subject digests;
- that the evidence commit adds only its directory;
- for each of the 12 mutant rows: the spec's edits, each `old` occurring exactly once in its file at the recorded commit
  (`bb05df7e` or `f207d758`), `new` ≠ `old`, and the runner's own `oldCount` of 1;
- that each outcome agrees with its `exit`, `failedTests` and failed rows, `cleanAfter` holds, no row timed out, and each
  `summary.json` row equals its raw row;
- the gate-diff tool digest, and the 5,598 paths and their digest re-derived from both trees;
- 319 → 328 refusals, the surface versions and the test counts.

| PR-body claim | Result |
|---|---|
| #530 moved the POC's hashing from protected POC files into `packages/support`, which had no prefix | [Observed] §2 (`restoration.py`) |
| the gate accepted a dirty `packages/support/src/sha256.ts` or `package.json` | [Observed] both `accepted` at base in `gate-diff-rerun.json` |
| the prefix is added; "Nothing else in the gate changes" | [Observed] |
| the table row kills V12, V14 and V15, which survive at BASE; V14 by the table alone | [Observed] reproduced exactly |
| the guard follows static, type-only, re-export and literal dynamic imports; an unresolvable specifier fails it | [Observed] O3, E1, E2, E3, O4, E7, O5 |
| subset property (O6 killed by the table and the old row, not the guard) | [Observed] |
| both derivation methods give exactly the five packages | [Observed], and by my two further methods (Node's loader, esbuild) |
| [Inferred] the generation packages run only in operator commands that never call this gate | Confirmed by the call sites and the loads (§3.5) |
| differential: 5,598 paths, 9 differ, all support, 319 → 328; probes stay accepted | [Observed] re-run, JSON-equal |
| authority citations (`R-GP-IMPL-HTTP-HOST-1-RAW.md:127`; dispositions `:63-70`) | [Observed] l.127 is the ruling; l.63–64 and l.69–70 carry the quoted text |
| "POC startup: a dirty `packages/support/` now fails the observer-clean check that `poc-main.ts:136` runs" | [Observed] |
| "No served byte changes" | **Not true** for a dirty support path: re-observation answers 502 (N4) |
| surface version `polaris@e4fd613eed56` → `polaris@3f91047d44cf`; no bound record carries it | [Observed] against base; the landed value differs (N5) |
| `record.py --check` 0 problems, `--selftest` 29/29 | [Observed] |
| closure 106 modules and 116 inputs; base accepts 5, head 0 | [Observed] |
| O1–O6 killed by exactly the rows named | [Observed] reproduced exactly |
| titles 1,134 → 1,136, +2, 0 removed | [Observed] in `titles.json`; consistent with my runs: POC project 1,136 tests at base and 1,138 at head, each including the 2 skipped |
| suite at HEAD: 1,138 total, 1,136 passed, 0 failed, 2 skipped | [Observed] in my head run, POC project |
| `dist_absent.py`: 37/37 with every `dist` removed | [Observed] re-run at `f207d758`: `'total': 37, 'passed': 37, 'failed': 0`, `distAfterRemoval: []` |
| trial merge with `d38d7a3c` clean; `check_governance`, `record.py --check`; git-observation, main, polaris-authority-sweep 42/42 | [Observed] 13 + 24 + 5 = 42 passed in merge #1 |
| Residuals: generation packages unprefixed; cap1-daemon prefix retained | [Observed] both true and unchanged |
| `Tests: +2 ~0 -0` | [Observed] |
| battery `commands=110 nonzero=0` | [Unknown] not re-run in this review |

## 4. Findings

No blocking finding. Seven notes, each for the dispositions record and, where marked, a follow-up bead.

**N1 — The guard follows only literal specifiers: a computed `import()` or a `createRequire` load of an unprefixed package passes
it.** Severity: low.
- Evidence [Observed]: E8 (`import(liveName)`) and E9 (`createRequire(import.meta.url)('@syzygy/polaris-generation-core')`) both
  survive at `f207d758`, exit 0, 0/13 failed. The guard's comment scopes it to "dynamic with a literal specifier"
  (`git-observation.test.ts:141-142`), but the PR body's Residuals do not name these forms.
- Plausibility [Observed]: over 513 tracked source files under `apps/` and `packages/` at `6ef18990`, non-test files hold 0
  non-literal `import(`, 0 `createRequire` and 0 `require(` (`sweep-dynamic.txt`). A second method, `git grep -P` over the same
  trees, finds only 6 literal dynamic imports outside tests, all in `apps/syzygy/src/main.ts` and
  `packages/polaris-dossier/src/polaris.ts`, both outside the closure.
- Failure scenario: a later change loads a workspace package from the daemon through `import(name)`. Its files have no prefix,
  so a dirty copy reads as clean and the snapshot's `observer:` revision misnames the running code.
- Proposed fix (follow-up bead, test-only): a census row over the guard's `reachable` that fails when a reached module contains
  `import(` whose argument is not a string or no-substitution template literal, `createRequire`, or `require(`. It passes on
  today's tree, which has none of these forms, and kills E8 and E9. Its specs are in `rev540-specs.json`.

**N2 — The root build inputs are neither derived by the guard nor pinned by any row.** Severity: low; pre-existing, outside the diff.
- Evidence [Observed]: G3 (drop `'package-lock.json'` from `exactInputs`) and G4 (drop `'tsconfig.base.json'`) survive at
  `f207d758` (0/13) and at `bb05df7e` (0/11). Only `'package.json'` has a row (`git-observation.test.ts:113`). All five reached
  packages' `tsconfig.json` files `extend` `../../tsconfig.base.json`. The guard's inputs are reached modules plus each package's
  `package.json` and `tsconfig.json`, so neither the `extends` chain nor the root manifest and lockfile are derived.
- Failure scenario: a refactor drops `tsconfig.base.json` from `exactInputs`, or a package's tsconfig comes to extend a new root
  file such as `tsconfig.node.json`. A dirty compiler-options file then reads clean, and no test fails.
- Proposed fix (follow-up bead, test-only; it changes no gate decision, since these files are already refused): add
  `package.json`, `package-lock.json` and every `extends` target of each reached `tsconfig.json`, followed transitively, to the
  guard's `inputs`. That kills G3 and G4 and covers the next root config file.

**N3 — No row pins the prefix boundary: `'packages/support'` without its trailing slash passes every test.** Severity: low; the same
gap exists for every prefix before this PR.
- Evidence [Observed]: G1 survives at head (0/13); G6 (`'packages/http-host'` without its slash) survives at base (0/11). The
  mutation is a tightening, refusing `packages/supportive/x.ts` and `packages/support-x/src/a.ts`.
- It is equivalent on today's tree: over 5,619 tracked paths at `6ef18990`, 0 start with any of the six prefixes minus their
  slash without starting with the prefix itself. A second method agrees: `git ls-tree` lists 12 directories under `apps/` and
  `packages/`, none a sibling-name of a prefix.
- Only the differential's probes catch it (D3).
- Failure scenario: a later edit drops a slash, and a new package named `packages/support-…` or `packages/http-host-…` is then
  refused by the POC gate. That is an unlisted tightening under the stop clause, visible only to someone who re-runs a
  differential.
- Proposed fix (test-only): in the table row or the "allows unrelated dirty files" row, assert that a sibling of each prefix
  is accepted (e.g. `${prefix.slice(0, -1)}-x/src/a.ts`, plus `packages/supportive/x.ts`). It kills G1 and G6.

**N4 — The PR body's "Every changed output" omits re-observation: "No served byte changes" is not true for a dirty
`packages/support/` path.** Severity: low; the change is still within the restoration, but the owner notice must name it.
- Evidence [Observed: the gate's decision and the code path; Inferred: the responses, since no daemon was run without Butlers]:
  the gate also runs inside `observe` for re-observation (`poc-main.ts:183`). With a dirty support path at head:
  - `POST` re-observe (`reobserve-action.ts:47-48`, both mount paths) answers `status: 502`, "Re-observation unavailable", with
    `data-reobserve-reason="POC runtime inputs are dirty; re-observation was refused"` (`reobserve-action.ts:29-33`). At base it
    answered `200` "Re-observed".
  - The watch-mode console prints "Re-observation unavailable: Unknown — POC runtime inputs are dirty; re-observation was
    refused. The prior complete evaluation remains served." (`watch-mode.ts:31`).
- Pre-#530, a dirty hashing byte was refused on both arms, so both changes are part of the restoration.
- Proposed fix (owner notice and dispositions, no code): the restored refusal covers both arms for every `packages/support/`
  path: startup exits 1 with `syzygy POC: POC runtime inputs have uncommitted changes`, and re-observation answers 502 with the
  reason above.

**N5 — The surface version on landing will be neither value the PR body names.** Severity: low.
- Evidence [Observed]: computed with the `pwbSurfaceVersion` formula:
  - `bb05df7e`: `polaris@e4fd613eed56`; `f207d758` and `6ef18990`: `polaris@3f91047d44cf`;
  - `main` at `d38d7a3c`: `polaris@a003c26c7172`, because #487 changed `apps/three-surface-poc/src/polaris-authority-sweep.test.ts`;
  - the trial merge `3c631e0c`: `polaris@eb1df5399d4f`.
- At the trial merge, no tracked file carries any of the four values except this bead's own `summary.json` (`git grep -F`).
- Proposed fix (owner notice): cite the landed merge commit's surface version, computed after landing, or none; do not cite
  `3f91047d44cf` as the landed version.

**N6 — The bead's step-3 rule-6 wording is met only in its import form; a manifest-only dependency passes the guard by design.**
Severity: note.
- Evidence [Observed]: E11 (`"@syzygy/polaris-dossier": "0.0.0"` added to `apps/three-surface-poc/package.json`, with no import)
  survives, 0/13. O3, O4 and E1–E7 (import edges) are all killed.
- The bead's noun is "the POC's runtime closure", and its two parentheticals are proxies for it. I endorse the import-graph
  reading (§3.5).
- Proposed fix (dispositions and bead text):
  - restate the requirement as "a new import edge from the daemon entry's closure to an unprefixed workspace package must
    fail" and cite the killing mutants;
  - record E11 as surviving by design;
  - record that the guard's population excludes packages named only by `build:poc` or by tsconfig `references` (today
    `cap1-daemon`, `polaris-generation-core` and `polaris-generation-consent`).

**N7 — Only out-of-suite evidence pins the guard's own edge handling.** Severity: low.
- Evidence [Observed]: a guard that drops type-only edges (T9) or dynamic edges (T10) survives alone and also survives paired
  with the one tree edit that edge kind carries (E1, O4). So nothing in the suite would notice if the `specifiersOf` lambda were
  "simplified" to a narrower matcher. The pins are this PR's O3/O4 and my E1–E7, which live in evidence, not in the suite.
- Proposed fix (optional, test-only): one fixture row that runs the guard's `specifiersOf` over a synthetic module containing
  each claimed edge kind (static, type-only, re-export, literal and template dynamic) and asserts all five specifiers come back.
  It kills T9 and T10 alone.

## 5. Every changed output

- **Gate decisions** [Observed]: exactly 9 of 5,598 paths change, all `packages/support/…`, accepted → refused: `package.json`,
  `tsconfig.json`, `src/deep-freeze.ts`, `src/deep-freeze.test.ts`, `src/index.ts`, `src/sha256.ts`, `src/sha256.test.ts`,
  `src/support-purity.test.ts`, and the probe `src/new.ts`. Against pre-#530, no decision on any path tracked then changes.
- **POC startup** with such a path dirty [Inferred, from the code path; the gate decision is Observed]: exit 1 and `syzygy POC: POC runtime inputs have uncommitted changes` on stderr
  (`poc-main.ts:154-157`, `startup-detail.ts:28`) instead of serving.
- **Re-observation** with such a path dirty [Inferred, likewise]: 502 "Re-observation unavailable" with the refusal reason, and the console line,
  instead of 200 "Re-observed" (N4).
- **Surface version** (a derived identity, not a served byte of an unchanged page): `polaris@e4fd613eed56` →
  `polaris@3f91047d44cf` against base; `polaris@eb1df5399d4f` at the trial merge (N5). No bound record carries any of these.
- **Nothing else**:
  - The two new rows add 2 test titles (`titles.json`: 1,134 → 1,136, 0 removed).
  - No refusal string, wire format, endpoint or signed or digest-bound artifact changes. The diff touches two `apps/` files
    and adds evidence only.
  - `check_governance.py`'s 53 check lines match base except CG-2a's file count.

## 6. Verdict per acceptance criterion

| Criterion (brief) | Verdict |
|---|---|
| Restoration premise (pre-#530 placement; the 9 paths; nothing else new) | **Met** (§2) |
| Derivation: daemon import graph is the right population; call sites; generation packages not loaded | **Met**; the lane's [Inferred] holds (§3.5); N6 for the record |
| Guard meets the bead's rule-6 in import form; manifest-only form | **Met** in import form (O3, O4, E1–E7); manifest-only survives by design (E11, N6) |
| Table row and guard: V12/V14/V15 and O1–O6 reproduce; own mutants | **Met**; all 12 reproduce exactly; 32 runs of my own mutants (15 killed, 17 survived) plus one control, every survivor named: E10 benign; T1, T4 and T6 controls by design; E8 and E9 (N1); G3 and G4 at head and base (N2); G1 and G6 (N3); E11 (N6); T9, T9b, T10 and T10b (N7) |
| Differential re-run and mutated | **Met**; reproduces, and D1–D3 each fail it; probes right (§3.4) |
| Remaining divergence unchanged (cap1-daemon still refused; no generation prefix) | **Met** (§2) |
| Record checked against git objects (rules 6, 11) | **Met**: `check_record.py` `132 ok, 0 problems`; `record.py --check` 0 problems at head and merge; `--selftest` 29/29 |
| PR-body claims | **Met** except "No served byte changes" (N4) and the landing surface version (N5); the battery line `commands=110 nonzero=0` was not re-run here [Unknown] |
| Full suite at head and on the merge; hosted CI | Host-load timeouts only, in files byte-identical to base, each passing alone; hosted green (§3.2) |
| Class ruling | Classes 3 and 4 touched, class 1 indirectly; GP-Q0 checks apply and are met; no change beyond the restoration (§2) |

## 7. Test quality

- **Regression test on pre-fix code (bar 2, l.58–59): met.** O1 is the base gate in the head tree, and it fails both new rows.
  V12, V14 and V15 survive at base and are killed at head.
- **Assertions are literal and independently derived (bar 4, l.64–67): met.** The table's expected value is the literal `false`
  over a hand-written prefix list; the guard's population comes from the tree, not from the gate, and its expected value is `[]`.
  Neither mirrors the gate's logic.
- **Failures name the defect (bar 7, l.82): met.** The table passes the offending path as the assertion message
  (`packages/cap1-daemon/tsconfig.json: expected true to be false`). The guard's diff lists the unprotected inputs, or the
  unresolved `<from> imports <specifier>` edge.
- **Edges and boundaries (bar 3, l.60–61): partly met.** The trailing-slash boundary (N3) and the root exact inputs (N2) have no
  row; both gaps predate this PR.
- **Each row catches something no existing row catches (bar 10, l.93–95): met.**
  - The table row kills V14 alone; the guard kills O3, O4, O5 and E1–E7 alone.
  - Net delta +2 tests, 0 removed. Extending the existing rows would have read worse: they pin single paths.
- **Determinism and tier: met.** The guard reads the checkout's source, not a build: the lane's `dist_absent.py`, re-run here,
  gives 37/37 with no `dist`. It ran in 257 ms in the head run, under the host load above. No sleeps, retries or network.
- **The guard's own edge handling is pinned only out of suite (N7).**

## 8. Cleanup

Scratch clones `clone`, `code`, `base`, `pre530` and `merge` deleted; private TMPDIRs `/tmp/r540-1` … `/tmp/r540-11` and
`/tmp/r540-ci` deleted; the vitest JSON reports (about 2 MB each) deleted after `tools/suite_summary.py` reduced them. Nothing was
pushed, commented or merged. Kept files (paths relative to `rev-540/`, none over 300 KB):

| Kept file | sha256 |
|---|---|
| `tools/check_record.py` | `0ef4134770de361a228af1be163bdf9817a31242d3b5b21a426938ee1d344b69` |
| `tools/closure_independent.mjs` | `3f32339b162c43909e5fb102c7b764a89ea4bdb91c7e21320d6444e486c3c2db` |
| `tools/compare_mutants.py` | `56ce652e2a277dfb9cc9f9e7659dcbdfa45d645f03e71533e173a1b0d42b7c2f` |
| `tools/load-hook.mjs` | `4cf5f8f1f18f7f45c3ba22045b07cdb036669deeb7c3257b1dc1849b663c0e86` |
| `tools/make_specs.py` | `d7e9a522ff44759527467dcc15095e7a3cc4c8f5203184c42ee28993cca36ea5` |
| `tools/make_specs_2.py` | `bac035be288ad482b627133d94b9a9fa710b1b214d52c52f1a768d90b52417cd` |
| `tools/make_specs_3.py` | `004b5885db9dccb5f79aefffc67fe591a73b6a9f993fad786dc74b96cfed472b` |
| `tools/mutate_differential.py` | `745d66439c55ad28c02d90482b57f48265768de58e6de9d2eef6eaecdf63ffc7` |
| `tools/print_loads.mjs` | `a223bdd829a7c84096c179ba1a15ede63dc1aad2c49203c1f68a04296280a55e` |
| `tools/restoration.py` | `f17ed3ed2a2a9ce04c84c9fe38676065da3766b5a1da7d935655bc14cde01c2f` |
| `tools/run_mutants.sh` | `99f29d68279a46de9e605c16442377b8398a13eece538409d79948ab16757daf` |
| `tools/suite_summary.py` | `12e313fee0aec114d9eda4197fb5a90b513a4851a4890cb341250dd5dc99c3d6` |
| `tools/sweep_dynamic.py` | `f387b2aa2c814773894e5ffa1424f73b591d9f3f86e357282efa7abfc481e3c1` |
| `base-build.log` | `fe1e71ecf272110628360b1103bfc2acd1edc24aa99f94c7fb06830430d9aca8` |
| `base-ci.log` | `5f7f6c47acdda1d3d17eb294fcba3ffbabcf75225ca81b510dfb98f3131bb6e5` |
| `base-fullbuild.log` | `4f46afe2ed5e6697e62e362e245332b0fd399cc6e3fff1dafacc438575f104a0` |
| `base-vitest.log` | `c582f6ffd7cbee6be7c6c2c4072937deb701769a82c4f02f1074969696e3af6b` |
| `check-record.txt` | `91bdbfcf6381772990fcaa30a948c8fada16c1a96079c5dbc3148dac0591fd49` |
| `closure-independent-base.json` | `691f8ac92bca87483ffebe0aa9578b17fd1140fe54f9643c8c510c5b4212b1e4` |
| `closure-independent-head.json` | `b8abfb5a03ad68c53bcecc8750b25a66ddd99e2fb975ab029aa8f1f7971ad6ad` |
| `closure-independent-merge.json` | `d874eb6cb4800a9fb0e7cb3353a52a3aad779d42887de64dacdf75b980e3383a` |
| `closure-independent-pre530.json` | `dec107f131bb8f42c11a2a95247705aa0d98d4335fe71df5d963d31e164e229c` |
| `differential-mutants.json` | `cc7f1e388c9382f62b743190c5ba707c393ea26a967bbc338c68dcc045c387b8` |
| `dist-absent-rerun.json` | `aa5241ab4b221f0de277842f7d7c47b26c052c8e5cb8146e71376cce267fbf0e` |
| `gate-diff-pre530-vs-head.json` | `abb671a4d16deb54764fe0256b876c7567e37395c60f467342dc3a88d3646e91` |
| `gate-diff-rerun.json` | `caff3958506de2d6ade2d16ac844f50e611e64d1a865d2dc883deeef97dd3d42` |
| `gov-base.txt` | `ccd7b8cd2525d0268b221a933db5cf67bb88c95fe712a9d62dee34659a8e8009` |
| `gov-head.txt` | `a08bc4c714844e1ade992619f7d514eba48dec72f89d5b36a14e5f8e0a5206f1` |
| `gov-merge.txt` | `767868c7d802e8f65aabebed173d43b81fa7c129affde53e5ed6f91569f98c0e` |
| `head-build.log` | `4f46afe2ed5e6697e62e362e245332b0fd399cc6e3fff1dafacc438575f104a0` |
| `head-typecheck.log` | `3ec872e6d363ffc2177d40cf6a5ef339c51c6f8d458776ab43e8b52ddc9b017d` |
| `head-vitest.log` | `9e32dcd6a2a8610f7e8d470d801b83ee3ef8f1c625949d0fca35e1d54f07a98e` |
| `merge-build.log` | `4f46afe2ed5e6697e62e362e245332b0fd399cc6e3fff1dafacc438575f104a0` |
| `merge-typecheck.log` | `3ec872e6d363ffc2177d40cf6a5ef339c51c6f8d458776ab43e8b52ddc9b017d` |
| `merge-vitest-2.log` | `e77f520d4bd897ab96c9f8c57521c3827c5fdd815db820ff7f039665d096e970` |
| `merge-vitest-3.log` | `36638f92ec57141605e166825278fb1f0579fa61eda32857999f42efefb5d2de` |
| `merge-vitest-4.log` | `fa5e50a2f61942823537c8d7edf146d6a4f0d45ed93a7dda21d927c2851874f3` |
| `merge-vitest.log` | `fa775cfea8d066709bbcb02825441ee4ade8e5537394e5654abfd21c708c068d` |
| `mut-own-head.json` | `1f37b65aee069830d38ce14f1f50faa1bd14ff9e5d7baecff8d0df020cdf8408` |
| `mut-own-head.log` | `0ac09ab24f81ad699225ec0ddda9bd22742f8bf2e251c7d84f5d270de9f9d4ad` |
| `mut-rev540-base-2.json` | `a1fdd9548b78d879709b5218462647f5daea86b743dc8c35d0bec2ad6426f461` |
| `mut-rev540-base-2.log` | `00845332fde28e5416dbddc1356d10bd191bafba7f51c77c3bc2f43ec2c49dd8` |
| `mut-rev540-head-2.json` | `4132fd52e47a3b3cb9e279d2cbeca2a580a4cebc55dc17c4baf629e40f648081` |
| `mut-rev540-head-2.log` | `c20801f3b392a7afd4c8206db6f9180683f65312a9ce6ba7399f3521b40d048e` |
| `mut-rev540-head-3.json` | `efb392bfde69c2d5228a64065e6c762ea69ddbdf02fdbc5c3e4a519ba665cdd5` |
| `mut-rev540-head-3.log` | `5e99dc0d47932cb453d6cfaa4e9882d7c16bf0b7da0b1b658d15da1d2aa30fba` |
| `mut-rev540-head.json` | `c8a5c874a151dce0455ba7b90018fad0ef0deee6aa66708524d6fb55a68cd205` |
| `mut-rev540-head.log` | `6e800d5eba8e586422ad2b33d7223680655829616c2a824fc1d6dfeb28258c65` |
| `mut-v12-base.json` | `fe7dd50c655ccfb4e5fd2fdad764f3e3b41412848e577f50e14d07fdb4816705` |
| `mut-v12-base.log` | `3bf794d8966ade516546a7aa6970995a0cc9e1f13465d24a64508894fa6cdf9f` |
| `mut-v12-head.json` | `c0dc0cccccec8b559cbe0ffa7a3418bbd0571648e94456fc81345fc8ccc6a571` |
| `mut-v12-head.log` | `58855d8d8677369be4a123516aba160767f81db09bac643617f40536a624ddde` |
| `mut-v14-v15-base.json` | `76759156e081adf10feccfb04c060606a24d33af1738e6f84d90f2bef463ea10` |
| `mut-v14-v15-base.log` | `8c454068a55019056cd0c3347fb5d695d44a85ff920e906c15e18941193834f6` |
| `mut-v14-v15-head.json` | `7738a5cf52bb4926ab46ae2b8c950b8401d043e6a0fdbe99f5d5717057fec7b0` |
| `mut-v14-v15-head.log` | `cd8299c3b3c07a57c4017e6b33f1861e6912552be4ef4bd94222db24a92aec57` |
| `npmci-head.log` | `df99c6c7794f3c7a0bdf8523d26eb6d3d2ab18a0f93e269ff66c8eb1c8165c93` |
| `pr-body.md` | `554480b2b1458f642c0aab262fb08a51069e122d5bf5df5d202f46cf8d00d529` |
| `pre530-build.log` | `cbd3ae247348b243d94bed683d5db4c993ebc6e66ea5f006f6ba5f0e8ef83bc3` |
| `pre530-ci.log` | `2ae064e28c6a3f7996fe981218ea32f9521e19ef9a856fccc0b08a5b607acd84` |
| `quot-head.txt` | `eca3cc1b92450ec8c9097e41b940b1895d4e8441df2713ec84c6bfacbdc8e3a1` |
| `quot-merge.txt` | `7a34ea59919f05b900f1e4c86ff402635584b01388c30cacee8cd936d2ed3093` |
| `record-selftest.txt` | `7808ef541528524d82178ec8e72e1e5ba0fb7c942a7a7bdeaf45ad773242a1fc` |
| `rerun-failed-base.log` | `dd8d96af19ce9f18f136c20ebd597249226a559f20059b10eb615ae7da5f1c53` |
| `rerun-failed-merge.log` | `7f9f0c3c3f08953c886a3f49e9125a56d57f05f05c539009567a5be0d5ab5aad` |
| `restoration.txt` | `21b1bdcdde3631cf17455dabbe2e1e09bc975bd2868514fd8e3f8fc7b889d3a6` |
| `rev540-specs-base-2.json` | `2087ccb8d88cbab589dc7812291b82528250c341a154580619fc3ea5d5bcdea1` |
| `rev540-specs-head-2.json` | `901762a8d48573754cacbe5ea8eebaf44afb0b43995636c8f1c3b381e7e4e4d7` |
| `rev540-specs-head-3.json` | `9a6d25c0e57e0391b4b4ea5c8cfe34b9a0ac4a4ce1daed885da3201fe11ca53f` |
| `rev540-specs.json` | `33947b4a65631715d809b59af28c7c3d95f1021f889ba02c9657879db67d24f0` |
| `suite-summary.json` | `cddb38c29cea059510b35bec6c768006bb2e841d95f8a7035389b22c8901c1ed` |
| `sweep-dynamic.txt` | `7a732ea857673f80d0d3a18984e49f70a68b07b9cace98b114c03d489dfb734f` |

72 files (1,846,516 bytes); the largest is merge-vitest-2.log at 191,555 bytes.
