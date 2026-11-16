# R-GP-IMPL-SOURCE-RESOLUTION-2 — CC-REV-1 implementation review of syzygy-bpyt.4.2, round 2
Verdict: REVISE
Reviewed commit: a607bb62
Subject: r2-review.diff sha256 5f9cd4e044e3d37ff936ec071613d5560b4942c5ca737ea431723dab0b5f004a

Reviewer: independent, fresh context, under brief `lead/b42pr/brief-r2.md`. Date: 2026-10-28 (runs logged in UTC, 04:19–04:47Z).
I fetched no content from any target repository and opened no credential file and nothing under `~/.claude/`. I changed no
tracked byte of the subject, pushed nothing, commented on nothing, and ran no bd mutation (`bd comments` only).

Summary: the code repairs are faithful and hold. Every round-1 code text is present as written, every deviation the lane names is
true, the emit differs from main `a1b9bde2` only as declared, the gate change is exactly one path, the clean build refuses every
input of mine before removing anything, all 32 recorded mutants are killed at the head, and the full suite passes with every dist
absent. **REVISE comes from the PR body alone**: four sentence groups are false at a607bb62 (F1–F4). Each has exact replacement
text below. No code change is required; round 3 can be the body edit plus a re-hash.

---

## 1. Subject identity checks

| Check | Result |
|---|---|
| Reviewed commit | [Observed] `git rev-parse` in my clone: `a607bb62cbd1574125ad62f1b92ddbe0ec985655`. `git ls-remote https://github.com/Tzeusy/syzygy.git refs/heads/agent/syzygy-bpyt.4.2` at the end: `a607bb62cbd1574125ad62f1b92ddbe0ec985655`. |
| Subject file | [Observed] `tools/rederive_subject.py` runs the three commands in order, each preceded by its `### <command>` line: `derived 5f9cd4e044e3d37ff936ec071613d5560b4942c5ca737ea431723dab0b5f004a 130354`, `frozen  5f9cd4e0… 130354`, `EQUAL`. **Matches the brief.** |
| Commits | [Observed] first-parent `2f249d2c..a607bb62`: `0a5a7271` (code), `8fcf409c` (tools), `cf2b7d32` (records), `8fb78d1b` (merge, parents `cf2b7d32` and `a1b9bde2`), `a607bb62` (records). `git diff --name-only 8fcf409c cf2b7d32` outside `docs/evidence/` is `AGENTS.md` only; `0a5a7271..8fcf409c` outside it is empty. |
| PR body | [Observed] read at the start (body `updatedAt` 2026-10-28T04:15:12Z) and at the end: both `0881d54d7a6bc80475fb2ccd4de8c98178977488d615164dc4ba6f2c3c4f9caf`. **Matches the brief; unchanged throughout.** Line numbers below are of that body (142 lines). |
| Hosted checks | [Observed] `gh pr checks 549`: `checks	pass	17m6s` (run 40625243948, workflow `governance-docs`, headSha `a607bb62…`) and `node	pass	4m19s` (run 40625243606, workflow `node-ci`, headSha `a607bb62…`). Node log: `Tests  5564 passed \| 5 skipped (5569)`, `Test Files  251 passed \| 3 skipped (254)`; test:system `SYZYGY_FRESH_CLONE: 1`, `src/fresh-clone.system.test.ts (1 test)` passed, `Test Files  10 passed (10)`, `Tests  51 passed (51)`; `no-egress proof ran under strace: 14 network-class calls, traced calls from 1 task(s), 0 Internet-family`. At `cf2b7d32` (run 40602353654): `Tests  5540 passed \| 5 skipped (5545)`. |
| Main movement | [Observed] main moved to `1a8864d9` (PR #550, `syzygy-bpyt.47`). `git diff --name-only a1b9bde2 1a8864d9`: 28 paths; 0 are PR paths (`comm -12` against the PR's 58 changed paths vs `a1b9bde2`). Two are code: `apps/three-surface-poc/src/polaris-generation/generation-mutation.ts` (3 lines, product; read by `product-build.test.ts`'s emitted-module model and built by `build:poc`) and its `.test.ts` (scanned by `sync-child-process-guard.test.ts`). The rest are docs and evidence. No manifest, tsconfig, `vitest.config.ts` or `scripts/clean_build.mjs`. `1a8864d9` merges into `a607bb62` with no conflict; on that merge the PR's 7 changed test files, `no-egress.test.ts` and `generation-mutation.test.ts` give `Test Files  9 passed (9)`, `Tests  154 passed \| 1 skipped (155)` (load1 28.90 before, 31.56 after; `main-merge-tests.log`), and `npm run typecheck` exits 0. |

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`, at a607bb62):
- :35–36: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
- :37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- :40–41: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
- :45–47: "**Class membership is contested by default and is never finally determined by the agent performing the change**"
- :49–50: "**The change record states** which classes the change touches, or "none," so a misclassification is a findable violation after the fact."
- :57–58: "Per the canonical bar, if the reviewer authors semantic fixes, the exact resulting head gets fresh independent review."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
- :52–55: "Behavior-preserving" means none of the following changes: "a rendered byte, a wire format, a refusal string or an exit code; a signed or digest-bound artifact; a consent, security or retention decision."
- :95–96, the stop clause: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**Engineering bar** (`git show a607bb62:.claude/skills/th-engineering/subskills/engineering-bar/SKILL.md`, unchanged since 2f249d2c):
- :74–77, bias 6: "**Prefer fail-fast over silent fallback** — … surface incorrect assumptions and invalid states loudly rather than masking them behind quiet fallback."
- :104–105: "**Docs and contracts current** — specs, READMEs, and standards the change touches are updated in the same change (bias 7)."

**Test-rigor bar** (`git show a607bb62:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`, unchanged since 2f249d2c):
- :42: "**A test is worth keeping only if some plausible bug makes it fail.**"
- :64–67, bar 4: "Expected values are literals or independently derived."

**AGENTS.md** at a607bb62: verification rules 2, 4, 6, 9 and 10; the guardrail "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it ran at".

**Coordinator's rulings** (`bd comments syzygy-bpyt.4.2`, `syzygy-bpyt.51`): the third ruling accepts `clean_build.mjs` "as written: it removes the dists of the projects tsc -b builds (the named projects and their references, transitively), then builds"; F2 "is ruled a restoration of base coverage (precedent f207d758) … owner notice at landing."

### Class ruling

**None.** The repair does not change round 1's class ruling ("None, in the reviewed bytes as they would stand once F2 is repaired as a restoration"), and F2 is now repaired that way.

- **Class 4: not touched.** [Observed] The S10 driver bundle, built the way `no-egress.test.ts` builds it at each tree (#545's alias map derived through that tree's own `workspace-reach.testkit.ts` resolver, plus the sources-only check; `tools/s10_bundle_r2.mjs`), is `18172eb2e96de6bb703c3c7110d61d5896853d2c865c2a609e9703dca79b3340`, 935,757 bytes, 178 regions, 0 workspace dist regions, at both main `a1b9bde2` and a607bb62. The two alias maps are equal (18 specifiers). Round 1 measured the same digest at b10e4da9 and 2f249d2c. Hosted node ran the strace proof (§1). The resolver change alters how the alias map is computed, not what it maps to.
- **Class 6: not touched**, as round 1 ruled; the merge adds no export entry (the support pin is exactly `{ '.': … }`, §3.8).
- **Class 3: not touched beyond the ruled restoration.** [Observed] The gate refuses exactly one more path than at b10e4da9 and main, `scripts/clean_build.mjs` (§3.4). At b10e4da9 the build definition lived in `package.json`, which the gate refuses dirty, so this restores base coverage of the build definition (the coordinator's ruling; owner notice due at landing).
- **GP-Q0.** [Observed] Beyond what the PR body and the rulings declare, nothing a gate accepts or refuses changes: the only product JS byte change against main is `git-observation.js`'s one `exactInputs` line (§3.2), and the merge's added lines change test pins and support's emitted set only, each listed (§3.9). The POC surface version moves (`polaris@0859ebf27876` → `polaris@8b9a5d20cc8b`), a content address over the two src trees that the body records; it is the same kind of move round 1 ruled not a class change.

## 3. What I ran, and the results

One scratch clone of `/home/tze/GitHub/syzygy` at `a607bb62`, with worktrees at `b10e4da9` (base), `a1b9bde2` (main) and `cf2b7d32`, each with `npm ci` (all exit 0). Node `v24.6.0`. Every suite ran under a private TMPDIR (`/tmp/r549b-*`, deleted). One vitest process at a time; the full suite once.

### 3.1 Full suite and typecheck, every dist absent

- [Observed] Every `apps/*/dist` and `packages/*/dist` removed (`find … -name dist` count 0, worktree clean). `npx vitest run`, 2026-10-28T04:27:16Z to 04:30:30Z, load1 35.63 to 33.22, exit 0 (`full-suite.log`, `full-suite.meta`):
  `Test Files  251 passed | 3 skipped (254)`
  `Tests  5564 passed | 5 skipped (5569)`
  No dist existed afterwards (count 0). **No file failed**, so no rerun alone was needed.
- [Observed] `npm run typecheck` (`tsc -p tsconfig.json`), every dist absent, load1 30.24: exit 0, no diagnostics, no dist created.
- [Observed] Per-file counts from that log for the body's six guard files: support-purity 33, owner-act-drafter 3, no-egress 7 (1 skipped), product-build 15, workspace-reach 61, sync-child-process-guard 6, so **124 passed and 1 skipped**, as body line 128 says.

### 3.2 The emit (`tools/emit_r2.py`, `emit-r2.json`)

Each tree built with `npm run build` from nothing (0 dists before each build; all three exit 0, load1 30–32). My tool is independent of the lane's `compare_emit.py`: it compares every suffix, and for a differing map lists which top-level JSON fields differ.

| suffix | a1b9bde2 files (tests) | head (tests) | identical | differ |
|---|---|---|---|---|
| `.js` | 521 (264) | 245 (0) | 244 | `apps/three-surface-poc/dist/git-observation.js` |
| `.d.ts` | 521 (264) | 245 (0) | 245 | none |
| `.js.map` | 521 (264) | 245 (0) | 243 | `git-observation.js.map` (`mappings`), `polaris-dossier/dist/cli.js.map` (`mappings`) |
| `.d.ts.map` | 521 (264) | 245 (0) | 244 | `git-observation.d.ts.map` (`mappings`) |

- [Observed] The one `.js` difference is the F2 line: `-    const exactInputs = new Set(['package.json', 'package-lock.json', 'tsconfig.base.json']);` / `+    // scripts/clean_build.mjs holds what \`build:poc\` removes and how it runs tsc (syzygy-bpyt.4.2).` / `+    const exactInputs = new Set([…, 'scripts/clean_build.mjs']);`.
- [Observed] Only in main, per suffix: 12 non-test files (the round-1 eleven plus `packages/support/dist/purity.testkit.*`) and its 264 tests; only at head: none. Build info: 12 at main, 10 at head; the two only at main are cap1-conformance's and cap1-system's.
- [Observed] Against b10e4da9 the same holds, plus `apps/three-surface-poc/dist/polaris-generation/generation-mutation.js` and its `.js.map`, which come from main (`cmp` says the head's equals main's). `polaris-dossier/dist/cli.d.ts` and `cli.js` are **byte-equal to b10e4da9's** (`cmp`), so the F3 pin works.
- [Observed] The head emits exactly two test-support modules: `packages/polaris-dossier/dist/full-run.testkit.js` and `packages/polaris-generation-consent/dist/recorder-fixtures.testkit.js` (245 `.js` files matched against `*.test.js`, `*.testkit.js` and the five named modules).
- **Every difference is the declared one.** This matches `emit-8fb78d1b.json` and body lines 43–46.

### 3.3 Test-support readers (`tools/reader_sweep_r2.py`, `reader-sweep-r2.json`; `tools/reader_imports.mjs`)

- **Population and predicate.** Every tracked file at a607bb62 that decodes as UTF-8, any suffix, `docs/reviews/` included: **7,343 of 7,354 tracked** (11 do not decode). A hit is a line holding the stem of one of the ten modules the head stops emitting (round 1's nine plus `purity.testkit`), or of the two kept kits (`str.find`), **and** matching `(?<![\w-])dist(?![\w-])` (Python `re`). A second predicate, over code files only, looks for lines naming a dist segment together with `readdir|\bwalk|glob|listdir|ls-files|\bfind\b`, which would catch a reader that takes a whole dist.
- [Observed] 79 hits. Outside the PR's own records (`docs/evidence/syzygy-bpyt-4-2/*.json`), AGENTS.md:329, `product-build.test.ts:32` and three raws under `docs/reviews/` (prose about outputs), the hits are exactly:
  - `scripts/dossier_scale_measure.mjs:32`: `const kit = await dist('packages/polaris-dossier/dist/full-run.testkit.js');` (kept kit)
  - `docs/evidence/syzygy-bpyt-6-15/closure.mjs:17`: the `workspace-reach.testkit.js` import (excluded; a retained evidence tool)
  - `packages/polaris-generation-core/src/island-boundary.test.ts:10` (a comment)
  
  `purity.testkit` has no dist reader outside records and raws.
- [Observed] 32 whole-dist lines, every one in a retained `docs/evidence/**` tool that walks, compares or removes dists, or in a test fixture string. None imports a module the head stops emitting; two import `test-model-fixture.js` and `test-walkthrough-judgment-fixture.js`, which are product-reached and still emitted.
- [Observed] The consent `./testing` entry is a reader too: `testing.ts:2` re-exports `./recorder-fixtures.testkit.js`.
- **So the lane's readers are all of them.** The lane names `scripts/dossier_scale_measure.mjs`, the consent `./testing` entry and `closure.mjs`.
- [Observed] Re-running the lane's `test_support_readers.py` at `8fcf409c` reproduces `test-support-readers-8fcf409c.json` exactly (`identical`; `population 1564; hits 180; dist readers ['docs/evidence/syzygy-bpyt-6-15/closure.mjs', 'scripts/dossier_scale_measure.mjs']`).
- **Does each still work?** [Observed] In the built head:
  - all six dist modules `dossier_scale_measure.mjs` imports load (`OK packages/polaris-dossier/dist/full-run.testkit.js 17`, `cli.js 7`, `git-object-reader.js 3`, `clone-shape.js 2`, `init.js 1`, `apps/three-surface-poc/dist/polaris-generation/dossier-site.js 5`);
  - `@syzygy/polaris-generation-consent/testing` resolves to `/packages/polaris-generation-consent/dist/testing.js` and exports its 10 names;
  - `closure.mjs`'s import fails: `FAIL packages/polaris-generation-core/dist/workspace-reach.testkit.js ERR_MODULE_NOT_FOUND`. That is the body's line-62 [Inferred], now observed.
  
  [Unknown] I did not run the full Redis-scale measurement, only its imports.

### 3.4 F2: the observer-input gate (`tools/gate_probe.mjs`, `gate-probe.tsv`)

[Observed] Each tree's built `pocObserverInputsAreClean`, one dirty path at a time:

```
path	base	main	head
scripts/clean_build.mjs	ADMITTED	ADMITTED	REFUSED
./scripts/clean_build.mjs	ADMITTED	ADMITTED	ADMITTED
scripts/clean_build.mjs.bak	ADMITTED	ADMITTED	ADMITTED
scripts/other.mjs	ADMITTED	ADMITTED	ADMITTED
package.json	REFUSED	REFUSED	REFUSED
tsconfig.json	ADMITTED	ADMITTED	ADMITTED
vitest.config.ts	ADMITTED	ADMITTED	ADMITTED
packages/support/tsconfig.json	REFUSED	REFUSED	REFUSED
packages/polaris-generation-core/tsconfig.json	ADMITTED	ADMITTED	ADMITTED
apps/three-surface-poc/tsconfig.json	REFUSED	REFUSED	REFUSED
(none)	ADMITTED	ADMITTED	ADMITTED
```
(16 paths in the file; every one but the first gives the same answer in all three trees.) **The gate now refuses a dirty `scripts/clean_build.mjs`, and that is its only change.** The source change is one `Set` member, and the JS emit differs in that line only (§3.2). Mutant R5 removes the entry; it is killed by exactly one failing test, `read-only Git observation protects the clean-build script that build:poc runs` (`AssertionError: expected true to be false`), in §3.6.

### 3.5 F4: the clean-build refusals (`tools/refusal_probe.py`, `refusal-probe.jsonl`)

Each case is a fresh tree: a, b→a, d→b, and c, built as in `product-build.test.ts`, with `kept` sentinels in every dist and in `packages/a/types`. It runs the head's script naming `packages/d` unless stated. Load1 31.21.

| Case (mine) | Exit | Message, verbatim | Sentinels removed |
|---|---|---|---|
| self-reference (`a` → `.`) | 1 | `Error: packages/d -> packages/b -> packages/a -> packages/a: project references form a cycle` | none |
| cycle not through the named project (a → b) | 1 | `Error: packages/d -> packages/b -> packages/a -> packages/b: project references form a cycle` | none |
| reference written as `../a/tsconfig.json` | 1 | `Error: packages/a/tsconfig.json: not a workspace project with a tsconfig.json` | none |
| reference `../a/` | 1 | `Error: packages/a/: not a workspace project with a tsconfig.json` | none |
| `compilerOptions` a string | 1 | `Error: packages/a/tsconfig.json: its outputs and incremental state are not both under dist` | none |
| tsconfig is JSON `null` | 1 | `TypeError: Cannot read properties of null (reading 'compilerOptions')` | none (N3) |
| `references` an object | 1 | `TypeError: object is not iterable (cannot read property Symbol(Symbol.iterator))` | none (N3) |
| `declarationDir: "dist"` | 1 | `Error: packages/a/tsconfig.json: its outputs …` | none |
| `outDir: "./dist"` | 1 | same | none |
| `outFile: null` | 1 | same | none |
| named `packages/c/../d` | 0 | none | a, b, d dists rebuilt (correct); c kept |
| named `packages/alias` → `packages/a` (inside) | 0 | none | a's dist rebuilt (correct) |
| a non-composite reference | 2 | `packages/b/tsconfig.json(1,237): error TS6306: Referenced project '…/packages/a' must have setting "composite": true.` | **a, b, d removed, then tsc refused** (N2) |
| `declarationDir` inherited through `extends` | 0 | none | `packages/a/types/a.d.ts` survives (declared, body line 32) |

- [Observed] **Every refusal of the script's own fires before anything is removed**: 10 of 10 refusing cases removed nothing. Structurally, removal is `clean_build.mjs:40`, after the visit loop at `:38`, and every `throw` is inside `visit`.
- [Observed] The cycle and `declarationDir` refusals hold with nothing removed, both in my cases and in the PR's own rows (R6, R7 killed, §3.6).
- [Observed] `tools/fidelity_f4.py` diffs round 1's F4 code block against `clean_build.mjs` (`const built` through the visit loop). The only difference is the replaced `const config = JSON.parse(…)` line: N1's realpath line takes its place, followed by N10's `try … catch { throw new Error(\`${path}: not plain JSON\`); }`. **F4's code is present as written**, N1 sits where the raw put it, and N10 drops the engine's message as `syzygy-bpyt.50` rules.

### 3.6 Rule 6 (`tools/rerun_mutants_r2.py`, `mutants-r2-a607bb62.jsonl`)

- [Observed] **The lane's tool cannot run at the head.** `python3 -I docs/evidence/syzygy-bpyt-4-2/tools/mutants_r1.py` stops with `M5: the fragment occurs 0 times in packages/support/tsconfig.json` and writes no record (`lane-mutants-tool-at-a607bb62.err`). The merge's item 12 changed support's `exclude`, which is M5's target (N1).
- [Observed] Which targets changed in the merge (`tools/mutant_targets.py`, comparing blobs at `8fcf409c` and `a607bb62`): 23 of 32 rows have an edited file or a test file that changed. Edited files changed for M1 and M2 (`workspace-reach.testkit.ts`, a comment change from main) and for M5 and X4 (`packages/support/tsconfig.json`). Test files changed for 21 rows (`product-build.test.ts`'s EXCLUDES). Every fragment except M5's still occurs exactly once.
- [Observed] So I re-ran **all 32 rows at a607bb62**. They read old/new and test files from `mutants-8fcf409c.json`, and only M5 takes the head's equivalent fragment (old ``,\n  "exclude": ["src/**/*.test.ts", "src/**/*.testkit.ts"]``, new empty). Dists were built, the worktree was clean before and after, and every file was restored (`"restored": true` on all 32). Run 04:32:20Z to 04:37:04Z, load1 19.97–33.60 per row.
  - Unmutated: `exit 0, 98 passed, 0 failed, 98 total`.
  - **32 of 32 killed.** Each kill's failing test, read from the JSONL:

| Rows | Killing test(s) |
|---|---|
| M1, M2 | the shared workspace resolver rows (3 and 4 failing) |
| M3, M4, R11, X2b | the tree's-own-exports rows; X2b and R11 by `the tree's own exports load, under the suite, each entry from its source module` alone (R11: `AssertionError: @syzygy/cap1-core/testing: expected { …(9), …(1) } to be { …(9), …(1) }`) |
| M5 (adapted), M6, M7, R1, R2, R4, X4 | the product-build rows (row 1 and/or the emitted-set row; X4: `packages/support: expected [ [ 'src/sha256.test.ts' ], …(2) ] to deeply equal [ undefined, [ 'src' ], [`) |
| R3 | `the product build imports no test or test-support module …` alone (`expected [ …(2) ] to deeply equal [ Array(1) ]`) |
| M8, M9, X3b | the clean-build row (X3b: `expected true to be false`, the depth-2 stale output survives); M9 and X3b also fail the five refusal rows that reach `packages/a` through the chain |
| M10, R6, R7, R8, R9, R10, X8 | exactly their own refusal row each (R7 and R9: `promise resolved "{ stdout: '', stderr: '' }" instead of rejecting`) |
| M11, M12 | `builds through the clean build alone, before every tool that runs a built module` |
| M13–M16 | their `suite child processes` rows |
| M17 | the typecheck row |
| R5 | the gate row alone (§3.4) |

- **Probes outside the record.**
  - X9 (`tools/x9_probe.py`, `x9-probe.json`, load1 27.08) puts X2b's plugin inside the POC app's project entry instead of at the root:
    - [Observed] With real dists, `workspace-reach.test.ts` and `sync-child-process-guard.test.ts` give `exit 0, 67 passed of 67`, so **neither sees it**.
    - [Observed] With `packages/support/dist/index.js` made to throw `R549B-POISONED-SUPPORT-DIST`, the app's `git-observation.test.ts` passes 14/14 unmutated. Mutated, it fails with `apps/three-surface-poc/src/git-observation.test.ts | R549B-POISONED-SUPPORT-DIST`, so the app's tests really load support's dist (F2).
  - X10 (`tools/x10_probe.py`, `x10-probe.json`) prepends `/// <reference path="./test-frozen.ts" />` to `packages/three-surface-poc-core/src/index.ts`:
    - [Observed] `tsc -p packages/three-surface-poc-core/tsconfig.json --listFilesOnly` then lists `…/three-surface-poc-core/src/test-frozen.ts`, so the build emits it. Unmutated, nothing is listed.
    - [Observed] `product-build.test.ts` passes 15/15 (F3). No tracked `.ts` under `apps/` or `packages/` has such a reference (0 of 523).

### 3.7 Merge, item 12 and the S10 bundle

- [Observed] `git show --remerge-diff 8fb78d1b` changes four files beyond the automatic merge, and the lane names each one:
  - `product-build.test.ts` EXCLUDES: `'packages/support': ['src/**/*.test.ts', 'src/**/*.testkit.ts']`
  - `no-egress.test.ts`: the conflict resolved to main's single line, `await bundleDriver(bundle);`
  - `support-purity.test.ts:118`: the pin
  - `packages/support/tsconfig.json`: the exclude
- [Observed] **`no-egress.test.ts` is byte-equal to main's**: blob `4448b9ad19950c1e2c0a2e9b187cb9cea9662e25` at both `a1b9bde2` and `a607bb62`.
- [Observed] The pin is round 1's N8 text exactly: `expect(manifest['exports']).toEqual({ '.': { source: './src/index.ts', types: './dist/index.d.ts', import: './dist/index.js', default: './dist/index.js' } });`.
- [Observed] Pin probe (`tools/pin_probe.py`, `pin-probe.txt`). Unmutated, `(0, 33, 0, [])`. It refuses each of these, with 1 failure in the pin row alone:
  - `source` dropped: `expected { '.': { …(3) } } to deeply equal { '.': { …(4) } }`
  - `source` naming `./src/sha256.ts`
  - a second entry `./purity`: `expected { '.': { …(4) }, './purity': { …(4) } } to deeply equal …`
  
  **It refuses what N8 asked.**
- [Observed] Excluding `*.testkit.ts` from support breaks no reader:
  - no dist reader of `purity.testkit` (§3.3);
  - support exports only `.`;
  - the full suite and the typecheck pass with every dist absent (§3.1);
  - the main-merge run passes (§1).
- [Observed] S10: §2, class 4.

### 3.8 Other body figures I re-derived

- [Observed] Test counts (`tools/count_tests.py`, `vitest list --json` over the eight files the body names): **82 at b10e4da9 and 104 at cf2b7d32**. The per-file changes are build-output 1→0, git-observation 13→14, product-build 0→15 and workspace-reach 54→61; the others are unchanged (sync 6, cap1-daemon package 4, http-host package 2, no-egress 2). That is +23 −1. **Body lines 118–122 hold.** At the head the same files list 108, since no-egress has 6 from #545; the body says its counts are from `cf2b7d32`.
- [Observed] Surface versions, through the head's own built `pwbSurfaceVersion` (`tools/surface_version_r2.mjs`, `surface-version-r2.txt`):
  - b10e4da9 `polaris@df13a4677575`
  - 2f249d2c `polaris@f0232ab663c4`
  - 8fcf409c and cf2b7d32 `polaris@6dfd8c513993`
  - a1b9bde2 `polaris@0859ebf27876`
  - 8fb78d1b and a607bb62 `polaris@8b9a5d20cc8b`
  
  **All as body lines 69–70 say.** `git grep -l -F` for each 12-hex over the 7,354 tracked files finds only the two `surface-version-*.json` records, so body line 71 holds. Current main `1a8864d9` is `polaris@5dcfb19eb795` (N4).
- [Observed] Aliases: base `vitest.config.ts` has 12 `'@syzygy/…':` keys, and `e7250716`'s message says "11 per-package aliases", as body line 18 says.
- [Observed] The cap1-conformance and cap1-system tsconfigs are deleted (`git diff --name-status`: `D`), and neither package, nor `apps/syzygy`, has `exports`. No `--force` appears in any of the 13 manifests' scripts. `restart.ts`, `docs/THREE-SURFACE-POC.md` and every `*system.test*` are unchanged since b10e4da9.
- [Observed] `python3 scripts/check_governance.py` at a607bb62: `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`.
- [Unknown] I did not run the canonical PROJECT-STATUS battery (body line 135, "commands=114, nonzero=0"). The brief does not require it.

### 3.9 Docs

[Observed] The repair changed one doc, AGENTS.md:325–335. Its new sentences are true at a607bb62:
- "excludes its tests and test-support modules; it still emits two kits a reader takes from `dist`" (§3.2, §3.3);
- "TypeScript emits any module a built one imports, so no other built module may import a test or test support" (an import claim; X10 is a reference, not an import);
- "`product-build.test.ts` lists the excludes per project and pins the one import edge into test support" (the test's EXCLUDES and the edge row).

AGENTS.md:309–314 ("Tests, the typecheck and the no-egress bundle load every `@syzygy/*` package by the `source` condition its `exports` lists first") stays true after the merge. #545's alias map is derived through the resolver that reads that condition, and the bundle is the source bundle (§2).

## 4. Findings

### F1 — Body lines 18 and 95–96 describe a no-egress change and an exports change that the head does not make (low, blocking: false sentences in the PR body)

**Evidence.**
- [Observed] Line 18: "`no-egress.test.ts` replaces its 10-entry esbuild alias list with `conditions: ['source']`."
  - At a607bb62, `no-egress.test.ts` is main's (blob `4448b9ad…` at both), and it has no `conditions`. It bundles by #545's `bundleDriver`: `alias: aliases, plugins: [sourcesOnly(SOURCE_ROOT)]`, with `aliases = workspaceAliases()` derived through `workspace-reach.testkit.ts`'s `resolve`.
  - Line 105 of the same body says "`no-egress.test.ts` is byte-identical to main's", which contradicts line 18.
- [Observed] Line 95: "Class 4: the S10 no-egress proof now resolves its bundle by condition instead of aliases." At the head, it resolves by aliases (derived), and the PR's only change on that path is the resolver that derives them.
- [Observed] Line 96: "Class 6: every private workspace package's `exports` map gains an entry."
  - No map gains an entry. Each existing entry gains a `source` condition, and the 17 entries are unchanged in number.
  - Three of the twelve private workspaces have no `exports` at all: `apps/syzygy`, cap1-conformance and cap1-system.

**Failure scenario.** The class candidates are what a later reviewer or the owner reads to contest the class (CC-REV-1 :49–50). A reader looking for the S10 proof's resolution goes to a `conditions` line that does not exist, and misses that the proof now depends on the changed `workspace-reach.testkit.ts` resolver. That resolver is the one dependency a later class-4 question would need.

**Exact fix (PR body).**
- Line 18: replace the sentence "`no-egress.test.ts` replaces its 10-entry esbuild alias list with `conditions: ['source']`." with:

  > `no-egress.test.ts` is main's since the merge (#545's `bundleDriver`): its alias map is derived through `workspace-reach.testkit.ts`'s resolver, which now reads each entry's `source` condition (below), and its `sourcesOnly` plugin refuses any resolution outside `packages/*/src` and `apps/*/src`. Before the merge, `e7250716` had replaced its 10-entry alias list with `conditions: ['source']`.

- Lines 95–96: replace the two bullets with:

  > - Class 4: the S10 no-egress proof's alias map is derived by `workspace-reach.testkit.ts`'s resolver, which this PR changes to read the `source` condition; `no-egress.test.ts` itself is main's. The round-2 review built the driver bundle at main `a1b9bde2` and here: byte-identical, sha256 `18172eb2e96de6bb703c3c7110d61d5896853d2c865c2a609e9703dca79b3340`, the digest round 1 measured at b10e4da9.
  > - Class 6: in the nine workspace packages that have an `exports` map, each of the 17 entries gains a `source` condition, listed first; the POC app's three bare-string entries become condition objects with the same dist target. No entry is added or removed.

### F2 — Body line 21 says the new row catches any entry that loads another module; a plugin declared inside one project escapes it (low, blocking: a false sentence in the PR body)

**Evidence.**
- [Observed] Line 21: "A row in `workspace-reach.test.ts` covers the plugin case. It imports each workspace export entry as the suite does, and requires the same module instance that the entry's `source` file loads as. So it fails when any entry loads another module, such as its dist."
- The row runs only inside the `@syzygy/polaris-generation-core` vitest project.
- X9 (§3.6) declares X2b's plugin in the POC app's project entry, which `extends: true` and may carry its own `plugins`. The row and the text check pass 67/67. Over a throwing support dist, the app's tests then fail with the poison, so they really load dist.
- The row does catch X2b, the root-level plugin, which every project inherits.
- This is round 1's F5 class: a guard sentence broader than its check. Item 5 asked the body to "say exactly what the text check and the new row each refuse".

**Failure scenario.** Someone adds a resolver plugin to one project's entry in `vitest.config.ts`. That project's tests silently read dists in any built checkout, CI included (`node-ci.yml` builds before `npm test`), while the body and the row say this is covered.

**Exact fix (PR body).** Replace line 21 with:

> - A row in `workspace-reach.test.ts` covers a resolver plugin in the root config, which every project inherits: inside the `@syzygy/polaris-generation-core` project it imports each workspace export entry and requires the same module instance that the entry's `source` file loads as, so it fails when such a plugin sends an entry to another module, such as its dist. A plugin declared inside one other project's entry is seen by neither this row nor the text check (the round-2 review's X9). The POC app's `.` entry is left out, because importing `main.ts` starts the POC.

Optional hardening, as a follow-up bead rather than this PR: make `sync-child-process-guard.test.ts` refuse any `plugins` key in `vitest.config.ts` (`/\bplugins\s*:/`; there are 0 today), with X9 as its mutant.

### F3 — Body line 16 says two rows "check what TypeScript emits"; they check an import-closure model that misses a triple-slash reference (low, blocking: a false sentence in the PR body)

**Evidence.**
- [Observed] Line 16: "Two more rows check what TypeScript emits: the emitted test-support set must be exactly those two kits, …"
- `emitted()` (`product-build.test.ts`) is the files the tsconfig names, plus their `importedFiles` (`ts.preProcessFile`), followed transitively within the project's `src/`. `preProcessFile` puts a `/// <reference path>` in `referencedFiles`, which the model does not read.
- X10 (§3.6): with such a reference to `test-frozen.ts`, `tsc --listFilesOnly` puts it in the program, so it is emitted, while `product-build.test.ts` passes 15/15.
- [Observed] Not reachable today: 0 of 523 tracked `.ts` files have a triple-slash path reference.

**Failure scenario.** A module gains `/// <reference path="./test-…ts" />`. The build ships test support again, and the rows the body describes as checking the emit stay green.

**Exact fix (PR body).** Replace "Two more rows check what TypeScript emits:" in line 16 with:

> Two more rows check a model of what TypeScript emits (the files each tsconfig names, plus every module of the project they import, transitively; a triple-slash `reference path` is not followed, and no tracked module has one):

Optional hardening, as a follow-up: compute the emitted set from `ts.createProgram(parsed.fileNames, parsed.options).getSourceFiles()` filtered to `<project>/src/`, which is exactly what tsc emits, with X10 as its mutant.

### F4 — Body line 76 says the repaired script removes the same dists as before for any acyclic tree; for trees it now refuses, it removes none (low, blocking: a false sentence in the PR body)

**Evidence.**
- [Observed] Line 76: "Since then the script has gained refusals. For a tree with no reference cycle, it removes the same set of dists and makes the same `tsc -b` call."
- Round 1 observed `2f249d2c` accept two acyclic trees, removing their dists and running tsc. With `declarationDir: "types"`, it exited 0 and removed both dists (F4a). With a symlinked project directory, it removed `outside/proj/dist` (N1).
- At a607bb62, both are refused before removal: my `declarationDir` case removes nothing, and R7 and R9 are killed by their rows. The same holds for `outFile`.

**Failure scenario.** A reader takes the stale-dist record (`stale-dist-8322df4f.json`) as covering every acyclic tree, when the sentence's own "gained refusals" means it cannot.

**Exact fix (PR body).** Replace the two sentences "Since then the script has gained refusals. For a tree with no reference cycle, it removes the same set of dists and makes the same `tsc -b` call." with:

> Since then the script has gained refusals. For every tree it still accepts, it removes the same set of dists and makes the same `tsc -b` call as at `2f249d2c`, and the stale-dist tree is one; a tree it now refuses (a reference cycle, a `declarationDir` or `outFile`, a project resolving outside the checkout) has nothing removed and no `tsc -b` run.

(Keep the next sentence, "Only the removal order changes: …".)

### N1 — The lane's rule-6 tool cannot run at the head (note)

[Observed] `mutants_r1.py` exits on M5 (`M5: the fragment occurs 0 times in packages/support/tsconfig.json`), because the merge changed M5's target. `mutants-8fcf409c.json` is valid for `8fcf409c` only, which it names, so it meets the AGENTS guardrail.

Fix: the dispositions record cites this round's run (`mutants-r2-a607bb62.jsonl`, 32 of 32 killed at a607bb62, M5's old fragment ``,\n  "exclude": ["src/**/*.test.ts", "src/**/*.testkit.ts"]``). If the tool is re-run after landing, add that adapted fragment for M5. No code change is needed in this PR.

### N2 — A tsc-side configuration refusal still lands after the dists are removed (note)

[Observed] A reference to a non-composite project: the script removes a, b and d, then `error TS6306: Referenced project … must have setting "composite": true.`, exit 2 (§3.5). The script header and the body list only the script's own refusals, so no sentence is false. [Observed] Not reachable today: all 10 project tsconfigs `extends` `tsconfig.base.json`, which sets `composite: true`.

Fix: none in this PR. If wanted, a follow-up could read the effective `composite` through `ts.getParsedCommandLineOfConfigFile`. That is the same TypeScript-parse route round 1's F4(a) named for inherited options.

### N3 — A tsconfig whose value is JSON `null`, or whose `references` is not a list, refuses with a bare TypeError (note)

[Observed] Both exit 1, nothing removed (`TypeError: Cannot read properties of null (reading 'compilerOptions')`; `TypeError: object is not iterable …`), so they fail closed. Neither names the file, as N10 asked for a parse error.

Fix (optional, follow-up): after the parse, `if (config === null || typeof config !== 'object' || (config.references !== undefined && !Array.isArray(config.references))) throw new Error(\`${path}: not a tsconfig object\`);`.

### N4 — The recorded surface version will not be the landing commit's (note)

[Observed] Main is now `1a8864d9` (`polaris@5dcfb19eb795`), and its `generation-mutation.ts` change moves the app src tree. The body names its commits explicitly, so line 70 stays true. The landing merge will show a third version, which the dispositions record should name.

## 5. Changed outputs

[Observed] Against main `a1b9bde2`, both built from nothing (§3.2):
- `.js`: 244 of 245 identical, plus `git-observation.js` (the F2 line).
- `.d.ts`: 245 of 245 identical.
- Maps: `git-observation.js.map`, `cli.js.map` and `git-observation.d.ts.map` differ in `mappings` only.
- Not emitted: 264 tests per suffix and 12 non-test files per suffix: the 8 excluded test-support modules of round 1's nine, the 3 cap1-conformance and cap1-system non-test modules, and `purity.testkit`.
- Build info: 2 fewer.

Product-visible changes:
- The POC surface version `polaris@0859ebf27876` → `polaris@8b9a5d20cc8b` (rendered on `/polaris`, recorded in the body).
- The gate's refusal of a dirty `scripts/clean_build.mjs` (ruled).
- The S10 bundle is unchanged (`18172eb2…`).

Nothing else is changed.

## 6. Round-1 items taken

| Item | Verdict | Basis |
|---|---|---|
| 1. F1 excludes, per-project literals, emitted-set row, kit mutant, reader list | **met** | The excludes are the raw's, except dossier names its two kits so that `full-run.testkit.ts` stays for `dossier_scale_measure.mjs`, a deviation the body names and explains. EXCLUDES are literal per project. Two rows check the emitted set and the import edge. R1 and R4 are killed. The reader list is complete (§3.3), and the readers work. Body line 16's wording is F3. |
| 2. F2 `exactInputs`, the test row, mutant | **met** | §3.4; R5 is killed by that row alone. |
| 3. F3 pin, `cli.d.ts`/`cli.js` equal to base, every suffix | **met** | §3.2. |
| 4. F4 code, two refusal rows asserting nothing removed, mutants, narrowed header and body | **met** | §3.5. The rows also cover `outFile`, non-JSON and outside-checkout. The header and body lines 25–32 are exact. Line 76 is F4. |
| 5. F5 behavioural row, X2b recorded, body line saying what each refuses | **partly met** | The row and X2b are as written (killed). The text-check sentence (line 20) is exact. The row's sentence (line 21) overclaims (F2). |
| 6. N1 realpath and fixture row | **met** | §3.5; R9 killed. |
| 7. N3, N4, N5 (X3b, X8, X4) | **met** | All killed at the head. |
| 8. N10 error names the file, no engine text | **met** | `packages/a/tsconfig.json: not plain JSON`; R10 killed. |
| 9. F6 build window, restart order, stale lines | **met** | Lines 108–113 carry the raw's bullets, labelled as round 1's run at `2f249d2c`, with an [Unknown] for the head. No "pending", "rerun" or "22.18" remains. Line 90's results are true (§1). |
| 10. Body line 3, line 40 (now AC 4) and emit claim; AGENTS.md | **met** | §3.2, §3.9. |
| 11. N7 surface version, re-derived at the final head | **met** | §3.8. |
| 12. N8 merge, bundleDriver kept, pin, testkit exclude, guard files and full suite | **met** | §3.7, §3.1. |

## 7. Test quality

- **Worth-adding.** Each new row is killed by a plausible bug of its own (32 of 32, §3.6). R3 shows the import-edge row catches what the emitted-set row cannot: a kit that is already kept, imported from elsewhere. R11 shows the identity row catches a resolver redirect that leaves every manifest unchanged.
- **Literals.** Expected values are literals: EXCLUDES, BUILT_KITS, the one edge string, the refusal messages and the pin. The emitted set is derived from the tsconfig and the import graph, independently of the build script. My X10 shows where that derivation stops (F3).
- **Edge and failure paths.** The refusal table covers the empty argument list, a missing tsconfig, outside-workspace, outDir/declarationDir/outFile, a cycle, non-JSON and outside-checkout. Each row asserts that the five sentinels survive, which also guards against a remove-then-refuse regression.
- **Test delta.** +23 −1 over the eight files (§3.8), stated in the body.
- **Weak spots.** X9 (a per-project plugin) and X10 (a triple-slash reference) survive. Both are unreachable today (0 `plugins` keys; 0 references). The fix this round asks for is the body's wording (F2, F3); the code hardenings are optional follow-ups.

## 8. Cleanup

- I deleted the scratch clone (`rev-549-r2/head`) and its three worktrees (`base`, `main`, `cf2`), my TMPDIRs (`/tmp/r549b-ci`, `/tmp/r549b-full`, `/tmp/r549b-mut`, `/tmp/r549b-ref`), the temporary copy of the PR body, and the npm ci, build and typecheck logs. `ls -d /tmp/r549b*` finds nothing.
- I killed no process. The lane's mutant tool, run in my clone, exited on its own (N1).
- No kept file is over 300 KB.

Kept files, relative to `rev-549-r2/`:

| `<path relative to rev-549-r2/>` | `<sha256>` |
|---|---|
| `emit-r2.json` | `19d5c3290de4bfb5dac13825e8a35fbccede030162281dcb5fa98167f849276a` |
| `full-suite.log` | `af68ced4466e0d6ef66f9911624dc95edd2951b837b2a32e82fd3ca2e5385f8a` |
| `full-suite.meta` | `4a8d36eb87ccc527b3295ec4bd4db62f1122951381708a4a52169228bccc37c4` |
| `gate-probe.tsv` | `b6b5edc45422619e866a51201268ec5ce09b6a75ad71af558e2c882c2342e9ab` |
| `lane-mutants-tool-at-a607bb62.err` | `6e54cae5da5276abe3f941c489ff74c4c3444605d82abdcd152426612edc75ee` |
| `main-merge-tests.log` | `40167600f1bc18c181db4689f362499affdf0827eacf39db8d982b6c5458e7c9` |
| `mutants-r2-a607bb62.jsonl` | `1de2b39c64845ccf03f53feb0ef9046896bad39a03534788350c1c56221bff21` |
| `mutants-r2.meta` | `d94f77abb84431418917e0372058db62902d60512942705ec6604b1298a4207d` |
| `mutants-r2.progress` | `de220a2422d2b639ced691bc64dd413408b7fb8d7177f0ddcafa0420b57a7c0f` |
| `pin-probe.txt` | `72ccfaba8ede8a05d51229a0524dac98a5f5d4f5514c2657891fcbb327a501e9` |
| `reader-sweep-r2.json` | `c89104d4184d5a7b863d0aadb7430185253f93da17772ab648d4ad25b459ced5` |
| `refusal-probe.jsonl` | `3ee189cbfbde8c56f3f496a54abcfcb5b72a25d5428eceddd66273ff848cd801` |
| `s10-bundle-r2.jsonl` | `4167e51faf6ca3a04370762873edb7d601acab630e3f61ee83b6b6841cdeebc7` |
| `surface-version-r2.txt` | `a61d33be8eccf93711d61692a650fea46ba976028e37b2478dcac836ecf0d9e8` |
| `tools/count_tests.py` | `b7d69d72fbeeae661cc86ddba74ae4613e1ebebbf2615d10013b81f35746aa60` |
| `tools/emit_r2.py` | `96ab1f70b90ae9e33ac87ef1efa99a2297db8cae46220a3a181b817dc6a6edd5` |
| `tools/fidelity_f4.py` | `a31ac7d1f0dc356344ba494b0a8acf46e807a5f7be7d926d3223d9b83f8124d6` |
| `tools/gate_probe.mjs` | `1c7b0b2dd6f40f174f49bacbe2feb1d6499ab5bd35749286cc0ef09a2b171724` |
| `tools/mutant_targets.py` | `7a0ca69693d9ba6691b3b462d99a90b7024cf6f7e74abf2033278210f77b2c0b` |
| `tools/pin_probe.py` | `cdb5fbd6f698831f0fd9589dbdc8043c97866219b7bf0acd407f7619d0917c7b` |
| `tools/reader_imports.mjs` | `bf704af84d11ffc96c0f1cd6f147710c6063e4f70ebe3402940bb351dea69212` |
| `tools/reader_sweep_r2.py` | `ae70d0b6c5c8de6ad4064ad9688a607a28930bab5051dd41bbf0903ab1ef2f6a` |
| `tools/rederive_subject.py` | `e84328a1bba873e67dfbbcd7e7a80eb3d8b98267cac286808dbd54fa7a993e23` |
| `tools/refusal_probe.py` | `ee71733f404f90a4f291550a0f4fee271bd9ba6d73bddb20208fa806dc8ad7e8` |
| `tools/rerun_mutants_r2.py` | `6b73a7cbd3a96c91a0879427d8708bae741e8010ecabe02c99cddde254d318fb` |
| `tools/s10_bundle_r2.mjs` | `010ac4b9f0d446da4fec05aee1885bac3c8d1a3dd34aa902dbccdc8b52dd4704` |
| `tools/surface_version_r2.mjs` | `eb7da41189940e048e331a72f1e6ea959dc43f6c25b9b1a28ff793c3ce4202f9` |
| `tools/x10_probe.py` | `f7cd96d4e5f663efab069d8721accb227f04fad3155b0d3cf3f69788c15c974b` |
| `tools/x9_probe.py` | `d14fa91a09ccdd3d1077638d6a76dd0a7b13e84dd630fcea95b8ce50108ff082` |
| `x10-probe.json` | `39fac3b287c8db0424723b817e3c937b0c2ec8771ffb15311345c00f83bbce1a` |
| `x9-probe.json` | `ae6e89cefa34067e4671ac310e1e01dba1a43edc9c438f1e714cdc22a7d2b2d4` |
