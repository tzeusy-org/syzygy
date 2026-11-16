# R-GP-IMPL-SOURCE-RESOLUTION-1 — CC-REV-1 implementation review of syzygy-bpyt.4.2, round 1
Verdict: REVISE
Reviewed commit: 2f249d2c
Subject: r1-review.diff sha256 ff10494fa6ec239e0eb7b34da96c5723d37ff64d6e78ba311340dfa80eda6c73

Reviewer: independent, fresh context, under brief `lead/b42pr/brief-r1.md`. Date: 2026-10-28 (runs logged in UTC, 2026-10-27T20:2x–21:2xZ).
I fetched no content from any target repository and opened no credential file. I changed no tracked byte of the subject or any worktree.
I ran no bd mutation (`bd show` and `bd comments` only).

Summary: the resolution model holds. Tests and the typecheck read no dist; I proved this with poisoned dists and with absent ones. The emitted JavaScript is as claimed, the clean build's closure equals `tsc -b`'s, and the stale-dist arms hold.
REVISE comes from six findings that change the reviewed bytes or the PR body before merge:
- F1: test support still ships in the product build, so AC4's "product only" is not met and the body says it is.
- F2: the POC observer-input gate does not cover the new build input, which goes to the coordinator or the owner.
- F3: one product declaration changed and is not declared.
- F4: two `clean_build.mjs` guard gaps contradict its own sentence, one of which removes before a refusal.
- F5: a guard sentence claims more than its check reads.
- F6: required disclosures are missing and stale lines remain in the PR body.

---

## 1. Subject identity checks

| Check | Result |
|---|---|
| Reviewed commit | [Observed] `git rev-parse` gives `2f249d2c4d0fc7756c8581c78c733a305336e705`. At the end of the review, `git ls-remote origin refs/heads/agent/syzygy-bpyt.4.2` gave the same id. |
| Base and merge base | [Observed] `git merge-base` gives `b10e4da9`. |
| Commits | [Observed] six: `e7250716`, `e7e01179`, `01c24bd1`, `8322df4f`, `a1f794c0`, `2f249d2c`. |
| Subject file | [Observed] `git diff b10e4da9 2f249d2c` hashes to `ff10494fa6ec239e0eb7b34da96c5723d37ff64d6e78ba311340dfa80eda6c73`, and `cmp` says it is byte-equal to `r1-review.diff`: 46 files, +1,409/−184. **Matches the brief.** |
| Diff without `docs/evidence` | [Observed] `git diff b10e4da9 2f249d2c -- ':!docs/evidence'` hashes to `c4daa828a1ba647c54ba890e281432ca9623d7cfd4d4ed75237ac5701c5aedf4`: 35 files, +328/−184. **Matches the brief.** |
| PR body | [Observed] read four times: at the start, twice during the review, and at the end (body `updatedAt` 2026-10-27T19:50:27Z). Every read hashes to sha256 `603b9aae17998761f8ae5b1e78789759d8b89af24f61ed89c2a4e244427225df` (6,247 characters, UTF-8). **Unchanged throughout.** The build-window disclosure the coordinator asked for never arrived. I judge this final body. |
| Hosted checks at 2f249d2c | [Observed] `gh pr checks 549 -R Tzeusy/syzygy` gives `checks	pass	18m13s` and `node	pass	4m0s` (read at the start and again at the end). The node job log has `Test Files  251 passed \| 3 skipped (254)` and `Tests  5520 passed \| 5 skipped (5525)`. The S10 proof ran under strace: `14 network-class calls, traced calls from 1 task(s), 0 Internet-family`. System tests have `10 passed (10)` and `51 passed (51)`, the fresh-clone test included. |
| Main movement | [Observed] At the start, main was `b10e4da9`. At the end, `git ls-remote` gave main `95c87a52` (PRs #546 and #547 merged). `git diff --name-only b10e4da9 95c87a52` lists 98 paths, and 3 of them are code-plane: `apps/three-surface-poc/src/polaris-generation/generation-mutation.ts` (product, 4 lines), `…/generation-mutation.test.ts`, and `packages/polaris-generation-core/src/workspace-reach.testkit.ts` (comment-only, lines 58–70). **The last is the one PR path among the 98.** The build reads the first, the typecheck reads all three and vitest runs the second. None of the 98 is `vitest.config.ts`, a tsconfig, a package manifest, `scripts/clean_build.mjs` or a no-egress bundle input. Main `95c87a52` merges into `2f249d2c` with no conflict. On that merge `npm run typecheck` exits 0, and `workspace-reach`, `product-build`, `sync-child-process-guard` and `generation-mutation` pass 88/88 (`main-merge-tests.json`; load not retained). |
| PR #545 | [Observed] `agent/syzygy-bpyt.6.14` was at `ecea355b` when I started and at `12d70cf0` later. Between the two, the only non-docs change is 2 lines in `support-purity.test.ts`, and the exports pin is unchanged. The merge results are in §3 and N8. |

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`, at 2f249d2c):
- :35–36: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
- :37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- :40–41: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
- :45–47: "**Class membership is contested by default and is never finally determined by the agent performing the change**"
- :49–50: "**The change record states** which classes the change touches, or "none," so a misclassification is a findable violation after the fact."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
- :52–55: "Behavior-preserving" means none of the following changes: a rendered byte, a wire format, a refusal string or an exit code; a signed or digest-bound artifact; a consent, security or retention decision.
- :95–96, the stop clause: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**Engineering bar** (`git show 2f249d2c:.claude/skills/th-engineering/subskills/engineering-bar/SKILL.md`):
- :74–77, bias 6: "**Prefer fail-fast over silent fallback** — … surface incorrect assumptions and invalid states loudly rather than masking them behind quiet fallback."
- :78–81, bias 7: "**Prefer same-change documentation and contract updates** — When behavior, assumptions, interfaces, or standards change, update the relevant docs … in the same change."
- :104–105: "**Docs and contracts current** — specs, READMEs, and standards the change touches are updated in the same change (bias 7)."
- :108–111: "**Test delta accounted** — added tests pass the worth-adding bar (each catches a bug no existing test catches) and net suite growth is stated".

**Test-rigor bar** (`git show 2f249d2c:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
- :42: "**A test is worth keeping only if some plausible bug makes it fail.**"
- :60–63, bar 3: "**Edge and failure paths are first-class** — Empty inputs, boundaries, invalid states, error branches, and concurrency-sensitive paths get tests proportional to blast radius."
- :64–67, bar 4: "Expected values are literals or independently derived."

**AGENTS.md verification rules** (at base and head): 2 (sweep before an all/zero claim), 4 (read the output and check the denominator), 6 (mutate per predicate), 9 (absence needs a denominator) and 10 (frozen bytes).

**Coordinator's third ruling** (bead comment, 2026-10-27 19:52, `bd comments syzygy-bpyt.4.2`): "Required: a PR-body disclosure of the build window (a concurrent syzygy dossier command reaching @syzygy/support fails during it; npm run build also clears apps/syzygy), and whether restart.ts stops the daemon before or after the build."

**Bead acceptance criteria** (`bd show syzygy-bpyt.4.2`):
1. "No emitted dist file is a test (count before/after)."
2. "No package.json script contains --force; build-output.test.ts deleted with its hazard eliminated (demonstrate: stale dist cannot change a tool's behavior)."
3. "vitest.config.ts has no per-package aliases; tests pass with every dist/ deleted."
4. "npm run typecheck is a real noEmit check including tests; npm run build emits product only."
5. "node-ci green; fresh-clone system test green."

The bead's target also says "tsconfig.build.json per package excluding *.test.ts and test fixtures for the emitted product".

### Class ruling

**None, in the reviewed bytes as they would stand once F2 is repaired as a restoration. As the bytes stand now, F2 bears on class 3 and must be routed.**

- **Class 4, security and egress paths: not touched.** [Observed] The S10 no-egress driver bundle is byte-identical at base, which resolves by the 10-entry alias map, and at head, which resolves by `conditions: ['source']`:

  ```
  {"form":"base","sha256":"18172eb2e96de6bb703c3c7110d61d5896853d2c865c2a609e9703dca79b3340","bytes":935757,"modules":178,"workspaceDistModules":[],...}
  {"form":"head","sha256":"18172eb2e96de6bb703c3c7110d61d5896853d2c865c2a609e9703dca79b3340","bytes":935757,"modules":178,"workspaceDistModules":[],...}
  BUNDLES-IDENTICAL
  ```

  I built the head bundle while every dist was poisoned, and it carries no poisoned module. The egress proof therefore examines the same bytes as before. Only how it finds them changed, and that is a test mechanism, not an egress path.
- **Class 6, public interface: not touched.** [Observed] 12 of 12 workspace manifests are `"private": true`. Node applies no custom condition, so the product's resolution is unchanged. Of the 17 export entries, 14 equal their base form once the first `source` condition is set aside. The app's 3 entries (`.`, `./dossier-render`, `./dossier-site`) were bare strings at base (for example `./dist/main.js`) and become `{ source, default }` with the same dist target. The value-poison probe in §3 shows Node loading dist. [Inferred] Node resolves a bare string target and a lone `default` condition identically, and no external consumer can depend on a private workspace's `source` condition.
- **Class 3, deterministic observation and evaluation identity: not touched by the changed lines, but see F2.** The observer-input gate (`pocObserverInputsAreClean`, `apps/three-surface-poc/src/git-observation.ts:176-195`) keeps the served daemon tied to the committed tree. The PR moves build logic out of `package.json`, which the gate covers, into `scripts/clean_build.mjs`, which it does not. That widens what the gate admits. GP-Q0 :95–96 routes it.
- **The POC surface version moves** (N7). It is a content address over the two src trees, so it is not a class change.

## 3. What I ran, and the results

I used two scratch clones (`rev-549/base` at `b10e4da9` and `rev-549/head` at `2f249d2c`), each with `npm ci`. Every suite ran under a private TMPDIR (`/tmp/r549-1` … `/tmp/r549-9`). Node was `v24.6.0` and tsc `Version 5.9.3`. I ran one vitest process at a time, and the full suite exactly twice.

### 3.1 Tests and the typecheck never read a dist

**Value poison.** `tools/poison_dists.mjs value` on `packages/support`, `packages/three-surface-poc-core` and `packages/polaris-generation-core`. It covered 4 entries, with 3, 258, 125 and 94 exports. Each JS entry was replaced by a module exporting the same names as `'R549-POISONED-VALUE'`, and each entry's `.d.ts` by one declaring every name as the literal type `'R549-POISONED-TYPE'`.
- [Observed] Node product resolution printed `R549-POISONED-VALUE`, so the poison is live for Node.
- [Observed] `npm run typecheck` exit 0. The control, the same program without `customConditions`, exits 2 with 1,705 `error TS` lines. The first is `packages/three-surface-poc-core/src/walkthrough-readiness.ts(126,18): error TS2349: This expression is not callable.`
- [Observed] 11 targeted test files that import those packages: `275 passed | 1 skipped`. The control, a config without `'source'`, gives `3 failed | 1 passed (4)` files and `64 failed | 6 passed (70)` tests. Load for the targeted runs was not retained.

**Throw poison.** `tools/poison_dists.mjs throw` gave `{"mode":"throw","count":506,"js":253,"dts":253}`: every emitted `.js` got a top-level throw, and every `.d.ts` was replaced.
- [Observed] `npm run typecheck` exit 0, 0 output lines.
- [Observed] Full suite, 2026-10-27T20:45:34Z to 20:50:05Z, load1 31.56 to 35.09, exit 0:
  `Test Files  251 passed | 3 skipped (254)`
  `Tests  5520 passed | 5 skipped (5525)`

**Every dist absent.**
- [Observed] `npm run typecheck` exit 0, and it created no dist.
- [Observed] Full suite, 20:51:14Z to 20:56:32Z, load1 37.76 to 44.70, exit 1:
  `Test Files  2 failed | 249 passed | 3 skipped (254)`
  `Tests  3 failed | 5517 passed | 5 skipped (5525)`
  All three failures are `→ Test timed out in 5000ms.`:
  - `gate-acts.test.ts > the sitting's acts fail closed > refuse an in-force record whose table binds other files than the form names, even when an act binds its bytes` (5,067 ms)
  - `start-gates.test.ts > init: a run that passes every start gate > pins the consented HEAD, …` (6,077 ms)
  - `start-gates.test.ts > init: the clone holds the consented commit alone (syzygy-qkea.24) > refuses config naming a remote, …` (5,367 ms)
- [Observed] Each file alone, every dist still absent: start-gates 104/104 at load1 35.12 (those rows took 1,422 ms and 1,648 ms), and gate-acts 133/133 at load1 29.05 (that row took 1,784 ms). **They pass alone.** The brief counts these as load timeouts, not failures. Hosted node, at its own load, shows 0 failures.
- Skips: `HAVE_STRACE` is false locally, so the S10 proof row is skipped in both runs. Hosted node ran it (§1). The Butlers-gated live files are skipped.

**Top-level conditions probe** (`tools/toplevel_conditions_probe.py`). This tests the new AGENTS.md sentence that a top-level `resolve.conditions` "never reaches the test runner". [Observed] The config moved to a top-level `resolve.conditions` over a throwing support dist fails with suite message `R549-POISONED-DIST support`, while the unmutated `ssr` form passes 3/3. **The sentence holds.**

**Source-entry identity** (`tools/source_entry_identity.py`). The population is every entry of every `exports` map in `apps/*` and `packages/*`. The `.js.map` beside each entry's built target decides which module tsc compiled it from. [Observed] `entries 17 ok 17` across 12 manifests; cap1-conformance, cap1-system and apps/syzygy have no `exports`. Every `source` is first, names the compiled-from module, has `import == default`, and has `types` as the sibling `.d.ts`.

### 3.2 Remaining dist readers

`tools/dist_reader_sweep.py` uses the Python `re` patterns `(?<![\w-])dist(?![\w-])` and `\balias\b`, one line at a time. The population is the tracked `.ts .mts .cts .js .mjs .cjs .json .yml .yaml .py .sh` files under `apps/`, `packages/`, `scripts/` and `.github/`, plus root files: **693 files, 285 hit lines in 72 files** (`dist-sweep-head.json`). I classified every hit.

[Observed] Readers that remain are product runs, which are allowed:
- the npm scripts `poc*` / `test:system` running `node apps/*/dist/*.js`
- `polaris.ts:55` spawning MAIN under tmux
- `restart.ts:79`
- `fresh-checkout-demo-main.ts:94,257`
- the cap1-system harness and system tests, which spawn the compiled daemon and import no `@syzygy` package
- the `scripts/*.mjs` measurement tools, which import a built dist without building (pre-existing)

**No test or test-support module reads a dist.** The throw-poison full run above proves it: every one of the 253 `.js` throws on import, and 5,520 tests pass.

### 3.3 The product emit

`tools/compare_emit.py` compared clean builds in both clones (`emit-compare.json`).
- [Observed] Base emitted 2,092 files: `.js` 256 product and 264 test, the same split for `.d.ts`, `.d.ts.map` and `.js.map`, and 12 `.tsbuildinfo`.
- [Observed] Head emitted 1,022 files: 253 each of `.js`, `.d.ts`, `.d.ts.map` and `.js.map`, and 10 `.tsbuildinfo`. 0 are tests and 0 exist only at head.
- [Observed] Of the 1,022 head files, 1,009 are identical and **13 differ**:
  - 9 `.tsbuildinfo`
  - `workspace-reach.testkit.js`, `.js.map` and `.d.ts.map` (the edited testkit)
  - **`packages/polaris-dossier/dist/cli.d.ts`** (F3)
- [Observed] 14 files exist only at base and are not tests: the 3 non-test modules of cap1-conformance (`fixtures/index`) and cap1-system (`harness`, `effect-observer`), with their maps and declarations, plus 2 `.tsbuildinfo`. The PR body discloses this.
- [Observed] All 547 relative imports in the emitted head JS resolve to an emitted file; 0 are missing. All 17 export targets exist.

**Product reach** (`tools/product_reach.mjs`, `product-reach-head.json`). [Observed] 253 built modules and 36 entries; entries are export `source` targets, app mains and `*main.ts` modules. 242 modules are reached and 11 are not:
- 9 are test support, imported only by tests (the F1 set).
- `public-source-screening.ts` is product code that only a test imports.
- `broker-client.ts` is spawned by path from `polaris.ts`.

### 3.4 The clean build

**Closure** (`tools/closure_check.py`). [Observed] The closure equals `tsc -b --dry -v` for both scripts. `build:poc` builds 8 projects (app, cap1-core, cap1-daemon, http-host, consent, gen-core, support, poc-core). `build` builds 10 (those plus apps/syzygy and polaris-dossier).

**Refusals** (`tools/clean_build_refusals.py`, `clean-build-refusals.jsonl`). Each case ran in a fixture tree with sentinels in every dist.

| Case | Exit | Error, verbatim | Removed |
|---|---|---|---|
| `outside` | 1 | `Error: outside: not a workspace project with a tsconfig.json` | nothing |
| `packages/../outside` | 1 | `Error: outside: not a workspace project with a tsconfig.json` | nothing |
| `packages/../../x` | 1 | `Error: ../x: not a workspace project with a tsconfig.json` | nothing |
| reference to a project with no tsconfig | 1 | `Error: packages/a: not a workspace project with a tsconfig.json` | nothing |
| `outDir: "out"` | 1 | `Error: packages/a/tsconfig.json: its outputs and incremental state are not both under dist` | nothing |
| `outDir: "./dist"` | 1 | same | nothing |
| `packages/b/` (trailing slash) | 1 | `Error: packages/b/: not a workspace project with a tsconfig.json` | nothing |
| absolute path | 1 | `Error: /tmp/r549-1/absolute/packages/b: not a workspace project …` | nothing |
| tsconfig with a comment | 1 | (a JSON parse error) | nothing |
| `./packages/b` | 0 | none | `packages/a/dist`, `packages/b/dist` (correct) |
| symlinked dist | 0 | none | the link only; `outside/linked-dist/SENTINEL` survives |
| **`declarationDir: "types"`** | **0** | none | a and b dists; **`packages/a/types/SENTINEL` survives** (F4a) |
| **reference cycle a↔b** | **4** | stdout `error TS6202: Project references may not form a circular graph. …` | **`packages/a/dist`, `packages/b/dist` removed before tsc refused** (F4b) |
| **symlinked project dir** | 0 | none | **`outside/proj/dist/SENTINEL`**, outside the checkout (N1) |

**Stale-dist demonstration.** I re-ran the lane's `docs/evidence/syzygy-bpyt-4-2/tools/stale_dist_demonstration.py` at 2f249d2c on a clean worktree (`stale-dist-rerun.json`). It plants poison in `apps/three-surface-poc/dist/main.js` and `packages/support/dist/index.js`, an orphan, and a deleted `routes.js`.

| Arm | Poisoned left | Orphan left | Deleted left missing | Dist identical to clean | Probe unchanged |
|---|---|---|---|---|---|
| incremental `tsc -b` | both | yes | yes | False | False (`Error: poisoned stale output`) |
| `tsc -b --force` | neither | **yes** | no | False | True |
| `npm run build:poc` (head) | neither | no | no | **True** | **True** |

The clean probe is `syzygy POC: configured repository authority rejected (locator-mismatched)`, exit 1, unchanged. **Every arm holds as the PR states.**

### 3.5 The build window, and restart order

`tools/build_window.py` polls nine entry files every 5 ms. Meanwhile, `node apps/syzygy/dist/main.js dossier help` runs back to back.
- [Observed] `build:poc` (`build-window-poc.json`, load1 27.93):
  - `"buildSeconds": 11.538`, `"anyEntryMissingSeconds": 10.931` (0.296–11.227 s).
  - Absent per entry: support 0.296–2.159, poc-core 0.296–5.503, gen-core 0.301–7.248, consent 0.313–7.938, app `main.js` 0.306–11.043, `dossier-site.js` 0.306–11.227. The `polaris-dossier` and `apps/syzygy` entries were never absent.
  - `"concurrentRunsDuringBuild": 54, "concurrentFailedDuringBuild": 53, "concurrentModuleNotFoundDuringBuild": 53, "concurrentFailedOutsideBuild": 0`.
- [Observed] `npm run build` (`build-window-build.json`, load1 29.59):
  - `"buildSeconds": 17.94`, `"anyEntryMissingSeconds": 17.304`.
  - `apps/syzygy/dist/main.js` itself was absent 0.363–17.654 s.
  - `"concurrentRunsDuringBuild": 188, "concurrentFailedDuringBuild": 187`. Only 1 of those failures was `ERR_MODULE_NOT_FOUND`; the rest are Node's missing-entry-script error, because `main.js` was gone.
- [Observed] Restart order:
  - `package.json` has `"poc:restart": "node apps/three-surface-poc/dist/restart-main.js"`, and `restart.ts` / `restart-main.ts` build nothing. They stop the running listener and start the same argv from the existing dist. **So restart stops the old daemon after any build, never before it.** The build is the operator's separate step, run while the old daemon still serves.
  - Every other `poc:*` script runs `npm run build:poc --silent &&` first.
  - [Inferred] The window does not reach a running POC daemon: its modules are already loaded, and the daemon path makes no lazy workspace import. The only lazy workspace imports are `apps/syzygy/src/main.ts:173-192` (dossier and dossier-site).
- [Observed] **The PR body discloses neither the window nor the restart order** (F6).

### 3.6 Rule 6

**Lane mutants** (`docs/evidence/syzygy-bpyt-4-2/tools/mutants.py`, all 17 rows, run twice).
- [Observed] First run (`lane-mutants-rerun.json`, load 34.89 to 34.08): `killed 17 of 17`, unmutated 77/77.
- [Observed] Second run, with failure messages (`lane-mutants-messages.json`, `tools/lane_mutants_messages.py`, load1 27–30 per mutant): 17 of 17 killed, unmutated 77/77. Fifteen were killed by `AssertionError`. M10 was killed by `Error: promise resolved "{ stdout: '', stderr: '' }" instead of rejecting` (a `rejects` assertion), and M15 by the guard's own `Error: vitest.config.ts: workspace packages do not load by t…`. **0 timeouts, and each kill is in the row it targets.**

**My mutants** (`tools/reviewer_mutants.py`, `reviewer-mutants.json`, load1 26.40 before, every dist present, worktree clean before and after). Unmutated 78/78. **7 of 10 killed.**

| Id | Mutation | Result and failing assertion |
|---|---|---|
| X1 | an export's `source` names a nonexistent module | killed: tree's-own-exports row, `AssertionError: expected [ '@syzygy/support .' ] to deeply equal []` |
| X2 | a vitest plugin sends `@syzygy/support` to its dist (name single-quoted) | killed, **incidentally**: `Error: vitest.config.ts: 10 projects but 9 recognized single-glob includes` (the project-count scan, not a resolution check) |
| X3 | the clean build removes one dist fewer than it builds | killed: `the clean build leaves no output it did not just write …`, `AssertionError: expected 'throw new Error("poisoned output");\n' to be 'export…` |
| X3b | references followed only from the named projects | **SURVIVED** (N3) |
| X4 | support's tsconfig adds a test by `files` | **SURVIVED** (N5) |
| X4b | the app's tsconfig includes its tests again | killed: `AssertionError: apps/three-surface-poc: expected [ [ 'src' ], undefin…` |
| X5 | the typecheck program drops `test-support` | killed: `AssertionError: expected [ 'apps/*/src', 'packages/*/src' ] to deeply equal [ Array(3) ]` |
| X6 | an app export's `source` names another module | killed: tree's-own-exports row |
| X7 | the clean build removes each dist while visiting, before a later refusal | killed: `Error: ENOENT … packages/b/dist…` in the refusal row (the fixture's own read of the removed file) |
| X8 | the workspace-path regex dropped | **SURVIVED** (N4) |

**Probes outside the suite.**
- X2b (`tools/x2b_probe.py`, `x2b-probe.json`, load1 35.99) is X2 with the plugin name double-quoted:
  - [Observed] With real dists, `"passed": 69, "total": 69`, so the suite does not see it.
  - [Observed] Over a throwing support dist, the mutant fails with `R549-POISONED-DIST support`, while the unmutated config passes 3/3. **So the mutant really redirects to dist, and no row catches it** (F5).
- Survivors (`tools/survivor_probes.py`, `survivor-probes.json`):
  - [Observed] X3b leaves `packages/a/dist/stale.js` in a c→b→a chain when it names c.
  - [Observed] X8 accepts `tools/x` and removes its dist.
  - [Observed] X4 emits `dist/sha256.test.js`.

### 3.7 S10 bundle (`tools/s10_bundle.mjs`, `s10-bundle.jsonl`)

[Observed] Base and head are identical (§2). I also built the bundle with neither the aliases nor the condition. That gives `"sha256": "272148baee86b8af0c264de55585c1632c8f7798a7f6fcb2860f4ddc5638d2c8"` with `"workspaceDistModules": [49, ["packages/support/dist/sha256.js", …]]`: dropping the condition silently bundles dists when dists are present (N6).

### 3.8 Merge with PR #545

I merged `ecea355b` into 2f249d2c in the base clone, then confirmed the merge at `12d70cf0`.
- [Observed] `packages/polaris-dossier/src/no-egress.test.ts` has a textual conflict. I resolved it with #545's side (`await bundleDriver(bundle)`).
- [Observed] `support-purity.test.ts` and `owner-act-drafter.test.ts` merge cleanly, but #545's pin (`support-purity.test.ts:116-118`, `expect(manifest['exports']).toEqual({ '.': { types, import, default } })`) **fails at runtime** (`merge-tests.json`): `@syzygy/support stays a pure leaf exports exactly the "." entry, index.js, so no other module is an entry | AssertionError: expected { '.': { …(4) } } to deeply equal { '.': { …(3) } }`. The 5 files give 112 tests: 110 passed, 1 failed, 1 skipped.
- [Observed] Merge typecheck exit 0.
- [Observed] #545's derived alias map, rebuilt under #549's resolver by a deleted probe test, resolves all 18 specifiers to src modules.
- [Observed] Building the merge emits `packages/support/dist/purity.testkit.js` (the F1 class).
- **So a clean textual merge hides a failure.** See N8 for what the second to land must change.

### 3.9 Docs

**Changed sentences.** [Observed] Every changed sentence is true at 2f249d2c, with one reading caveat under F1:
- AGENTS.md:215–219: `build`/`build:poc` run `clean_build.mjs`; `tsc -b` alone keeps an altered output; `--force` keeps an orphan. The stale-dist arms confirm it.
- AGENTS.md:307–312: no dist read; `ssr.resolve.conditions`; a top-level form never reaches the runner; a new export needs its `source` entry. The poison runs, the top-level probe and X1 confirm it.
- AGENTS.md:325–330: one noEmit program, needs no build first. The absent-dist typecheck confirms it.
- `docs/PWB-IMPLEMENTATION-PLAN.md:38-41`: a dated stale mark at the sentence, per the AGENTS guardrail.

**Unchanged AGENTS lines** that name dist or worktree resolution (`:269-270`, fresh `git worktree` / `npm ci`) remain true [Inferred: Node still resolves `@syzygy/*` through `node_modules` links].

**Sweep** (`tools/doc_sweep.py`, `doc-sweep-head.json`). Population: every tracked `.md .txt .yml .yaml`, **2,283 files**. Predicates (Python `re`, case-sensitive, per line):

```
FORCE        --force
BUILD_OUTPUT build-output\.test
ALIAS        \balias(?:es|ed)?\b
DIST_DECL    dist[` ]+declaration|through `?dist`? declarations|stale `?dist`?
APP_TC       tsc --noEmit -p apps
```
- [Observed] **535 hits; 183 outside retained or historical paths** (154 ALIAS, 14 BUILD_OUTPUT, 13 FORCE, 1 APP_TC, 1 DIST_DECL). I classified the 183.
- Guidance that is still live and now stale (N9):
  - `docs/design/POLARIS-M12-RETAINED-EVALUATIONS-FUNNEL.md:1825-1828`, whose implementing bead `syzygy-dov.12` is OPEN
  - `docs/superpowers/plans/2026-08-24-cap1-runtime-hardening-followups.md:854,910-911,970` (open epic `syzygy-u2a`; path-pinned)
  - `openspec/changes/three-surface-poc-experience/tasks.md:42` (signed off, not editable here)
- The rest are dated evidence, dispositions, pursuit or audit records, or unrelated uses of "alias" (TERM-REGISTRY, RFC prose).

### 3.10 Battery pieces the brief names

- [Observed] `python3 scripts/check_governance.py`, at head and at base, both `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`. The diffs are the scope count (7053 → 7064 files), CG-2a's examined count (`3061 files examined` → `3065 files examined`, 0 findings both) and AGENTS.md word counts.
- [Observed] `python3 scripts/check_quotations.py` exits 0, and its output is byte-identical at base and head. First line: `OK    QC-1  a quotation beside a path:line locator was said by that file — 40 quotations examined in 21 of 982 .md files scanned (loc-paren-quote 3, loc-colon-quote 26, quote-paren-loc 11), 0 findings`.
- [Observed] `npm run typecheck` exits 0 at head: with dists built, poisoned and absent.
- [Unknown] I did not run the canonical PROJECT-STATUS battery. The brief did not require it, and the third ruling dispatches this review after the lane's battery. I did not see that battery's result.

### 3.11 The observer-input gate

I probed it through the head's built `git-observation.js`, checked unpoisoned (0 `R549` bytes):

```
scripts/clean_build.mjs ADMITTED (reads as clean)
package.json REFUSED (dirty)
tsconfig.base.json REFUSED (dirty)
tsconfig.json ADMITTED (reads as clean)
packages/support/tsconfig.json REFUSED (dirty)
packages/polaris-generation-core/tsconfig.json ADMITTED (reads as clean)
```

- The root `tsconfig.json` is the noEmit typecheck, not a build input, so admitting it is right.
- gen-core's admission predates this PR: gen-core was built by `build:poc` at base too, and the gate's prefixes are derived from the daemon's imports. Not a finding here.
- `poc-main.ts:136`: `if (!deps.pocObserverInputsAreClean(observer)) throw new Error(dirtyRefusal);`

## 4. Findings

### F1 — Test support is still in the product build: AC4's "product only" is not met, and the PR body says it is (medium, blocking)

**Evidence.**
- [Observed] Nine modules that only tests or test support import are emitted at head: **36 files** (`.js`, `.js.map`, `.d.ts`, `.d.ts.map` each). From `product-reach-head.json`, with importer counts:
  - `apps/three-surface-poc/src/test-deep-dive-markers.ts` (2 test importers), `test-fixture-sweep.global-setup.ts` (1), `test-http-client.ts` (4)
  - `packages/polaris-dossier/src/child-process.testkit.ts` (3), `fs-patch.testkit.ts` (4), `full-run.testkit.ts` (5 tests and `test-support/no-egress-driver.ts`)
  - `packages/polaris-generation-core/src/workspace-reach.testkit.ts` (6)
  - `packages/three-surface-poc-core/src/test-cleanup.ts` (2), `test-frozen.ts` (3)
- Seven open with a `Test support:` comment (`// Test support:` or `/** Test support:`), and the other two are named `*.testkit.ts`. No product entry reaches any of them.
- The PR edits `workspace-reach.testkit.ts`, so the product build now ships a changed test kit. That is the one changed `.js` the body names.
- `@syzygy/cap1-core/testing` and `@syzygy/polaris-generation-consent/testing` are export entries and ship by design (AGENTS.md), so I count neither.
- [Observed] The merge with #545 adds `packages/support/dist/purity.testkit.js`.
- The bead's target says "excluding *.test.ts and test fixtures for the emitted product", and AC4 says "npm run build emits product only".

**False sentences.**
- PR body line 40: "`npm run build` emits the product only."
- PR body line 3, "The product build emits no tests", is true only for `*.test.ts`.
- AGENTS.md:327–328, "Each package `tsconfig.json` is the product build alone and excludes `src/**/*.test.ts`", is true of the config's role. A reader takes "product build alone" as "emits only product", and it does not.

**Failure scenario.** A test kit that patches `fs` or `child_process` (`fs-patch.testkit.ts`, `child-process.testkit.ts`) is now product bytes. A later product module that imports one by mistake compiles, ships and runs in the daemon, and no row fails, because `product-build.test.ts` only forbids importing `*.test.ts`. The next evidence record also counts these 36 files as product: the PR's "0 of them tests" is true while the bead's outcome is not.

**Proposed fix.** Exclude the named test-support modules from each product tsconfig. A `test-*.ts` glob is unsafe: `test-artifact-verification.ts`, `test-model-fixture.ts`, `test-project-shape-fixture.ts` and `test-walkthrough-judgment-fixture.ts` are product-reached.
- `packages/polaris-dossier/tsconfig.json` and `packages/polaris-generation-core/tsconfig.json`: `"exclude": ["src/**/*.test.ts", "src/**/*.testkit.ts"]`
- `packages/three-surface-poc-core/tsconfig.json`: `"exclude": ["src/**/*.test.ts", "src/test-cleanup.ts", "src/test-frozen.ts"]`
- `apps/three-surface-poc/tsconfig.json`: `"exclude": ["src/**/*.test.ts", "src/test-deep-dive-markers.ts", "src/test-fixture-sweep.global-setup.ts", "src/test-http-client.ts"]`
- After #545: `packages/support/tsconfig.json` `"exclude": ["src/**/*.test.ts", "src/**/*.testkit.ts"]`.

The root `tsconfig.json` still typechecks them. TypeScript still emits an excluded module that a built one imports, so in `apps/three-surface-poc/src/product-build.test.ts`:
- Replace row 1's single literal `[['src'], ['src/**/*.test.ts']]` with per-project literals.
- Add a row: every emitted module is reachable from a product entry; equivalently, no built module imports a `*.testkit.ts` or a listed test-support module.
- Record a mutant that re-includes one kit.

Alternatively, narrow line 40 to "`npm run build` emits no `*.test.ts`; nine test-support modules under `src/` (36 files) are still emitted, as at b10e4da9". That leaves AC4 unmet unless the coordinator rules the narrower reading.

### F2 — The POC observer-input gate admits a dirty `scripts/clean_build.mjs`, which is now a build input of the served daemon (medium, blocking; routing: coordinator, or the owner)

**Evidence.**
- [Observed] §3.11: `scripts/clean_build.mjs ADMITTED (reads as clean)` while `package.json REFUSED (dirty)`.
- At b10e4da9 the whole build definition of the served dist was the `build:poc` string in `package.json` (`tsc -b --force …`), which `exactInputs` covers (`git-observation.ts:179`).
- At 2f249d2c that string only names `node scripts/clean_build.mjs …`. What is removed, and how tsc is invoked, now lives in a file no exact input or prefix covers.
- `git-observation.test.ts` is unchanged by the PR and names no `clean_build`.
- Precedent: commit `f207d758` (syzygy-bpyt.6.15): "PR 530 moved sha256 into packages/support, which no observer-input prefix covered, so a dirty support package read as clean at POC startup … The prefix restores the pre-530 refusal of those bytes."

**Failure scenario.** An operator edits `scripts/clean_build.mjs` locally and does not commit, for example to skip the `rmSync` line for speed. `npm run poc` then builds incrementally, so AC2's hazard returns: a poisoned or orphaned output survives. `poc-main.ts:136` lets the daemon start as clean, and the served build no longer corresponds to the commit the observer reports.

This is a guard weaker than before for an input: a dirty build definition was refused at base and is admitted at head. The repair changes what a gate refuses (GP-Q0 :95–96).

**Proposed fix.**
- `git-observation.ts:179`: `const exactInputs = new Set(['package.json', 'package-lock.json', 'tsconfig.base.json', 'scripts/clean_build.mjs']);`
- `git-observation.test.ts`: add a row `expect(pocObserverInputsAreClean({ changedPaths: ['scripts/clean_build.mjs'] })).toBe(false)`, with a recorded mutant removing the entry.

Route: the coordinator rules it a restoration of base coverage, as `f207d758` was. Otherwise it returns to the owner as a decision bead under `syzygy-bpyt.1`.

### F3 — An undeclared product declaration change in `packages/polaris-dossier/dist/cli.d.ts` (low, blocking under the brief's rule)

**Evidence.**
- [Observed] `emit-compare.json` lists `packages/polaris-dossier/dist/cli.d.ts` among the 13 differing files. Line 81, in the inferred return type of `commandContext`:
  - b10e4da9: `env: Readonly<Record<string, string | undefined>>;`
  - 2f249d2c: `env: NodeJS.ProcessEnv;`
- `cli.js` is byte-identical, and `cli.ts` is unchanged by the PR.
- The source is `cli.ts:216`, `const env = ports.env ?? process.env;`, a union that TypeScript reduces.
- [Inferred] The reduction picks the other member now that the test files are no longer in the same program, which changes type-id order.
- [Inferred] No package consumer sees it. `commandContext` is not exported; `DOSSIER_COMMANDS` (whose `run` takes `CommandContext`) is exported from `cli.ts` but not re-exported by `index.ts:40`; and the package exports only `.`, `./argv` and `./state-directory`.
- The PR body's emit claim (line 23, "252 of the 253 are byte-identical; the other is the edited testkit") covers `.js` only. The lane's `emit-8322df4f.json` compares JS only.

**Failure scenario.** A later reviewer or bisect compares product declarations across this commit, sees an unexplained type change in a dossier CLI declaration, and cannot tell from the record whether it was intended. It is a product byte the PR does not declare, which the brief rules REVISE.

**Proposed fix.** Either one of these, plus extending `compare_emit.py`'s claim to all emitted suffixes:
- Declare it. Add to the Evidence list: "One declaration differs: `packages/polaris-dossier/dist/cli.d.ts:81`, `env: Readonly<Record<string, string | undefined>>` at b10e4da9 and `env: NodeJS.ProcessEnv` here, in the inferred return type of the unexported `commandContext`; its JavaScript is identical and no package export reaches it."
- Pin it. `cli.ts:216`: `const env: Readonly<Record<string, string | undefined>> = ports.env ?? process.env;` [Inferred: restores the base declaration; not run].

### F4 — `clean_build.mjs` refuses less than its own sentence and the PR body say: (a) a declaration directory outside `dist` is accepted, and (b) a reference cycle removes dists before the refusal (low, blocking under the brief's rule)

**Evidence.**
- (a) [Observed] The `declarationDir-outside` case: exit 0, both dists removed, and `packages/a/types/SENTINEL` survives. The check reads only the project's own `compilerOptions.outDir` and `tsBuildInfoFile` (`clean_build.mjs:22`). It ignores `declarationDir`, `outFile`, and any option inherited through `extends`.
- (b) [Observed] The `cycle` case: `packages/a/dist` and `packages/b/dist` removed, then `error TS6202: Project references may not form a circular graph`, exit 4. The `built.has` early return (`:18`) makes the visit terminate, but nothing refuses.
- [Observed] Neither is reachable in today's tree: 0 of the 12 tracked tsconfigs name `declarationDir` or `outFile` (`grep -F` over `git ls-files '*tsconfig*.json'`), and `tsc -b --dry` finds no cycle in either script's closure.
- The sentences: the script header (`clean_build.mjs:5`) says "A project it cannot read that way is refused before anything is removed." PR body line 17 says "It refuses, before removing anything, … a project whose outputs or build info sit outside `dist`."

**Failure scenario.**
- (a) Someone adds `"declarationDir": "types"` to a package. The clean build accepts it, and a stale `.d.ts` under `types/` survives every build. That is AC2's hazard back for declarations.
- (b) A mistaken reference creates a cycle. `npm run poc` deletes every dist in the cycle, then fails, leaving no runnable product where `tsc -b --force` used to refuse and keep the old one.

**Proposed fix.**
- (b), exact. In `clean_build.mjs`, replace lines 16–27 with:

  ```js
  const built = new Set();
  const visiting = [];
  function visit(project) {
    if (built.has(project)) return;
    if (visiting.includes(project)) throw new Error(`${[...visiting, project].join(' -> ')}: project references form a cycle`);
    const path = join(project, 'tsconfig.json');
    if (!/^(?:apps|packages)\/[^/]+$/u.test(project) || !existsSync(path)) throw new Error(`${project}: not a workspace project with a tsconfig.json`);
    const config = JSON.parse(readFileSync(path, 'utf8'));
    const options = config.compilerOptions ?? {};
    if (options.outDir !== 'dist' || options.tsBuildInfoFile !== 'dist/.tsbuildinfo' || 'declarationDir' in options || 'outFile' in options) {
      throw new Error(`${path}: its outputs and incremental state are not both under dist`);
    }
    visiting.push(project);
    for (const reference of config.references ?? []) visit(posix.normalize(posix.join(project, reference.path)));
    visiting.pop();
    built.add(project);
  }
  ```

  That also covers (a) for a project's own options. Add two `product-build.test.ts` refusal rows (cycle; `declarationDir`), each asserting that nothing is removed, with recorded mutants.
- (a), fully. The inherited case needs TypeScript's own parse: `ts.getParsedCommandLineOfConfigFile`, then refuse a resolved `outDir`, `declarationDir` or `tsBuildInfoFile` outside `<project>/dist`, or any `outFile`. This also accepts a JSONC tsconfig, which `JSON.parse` refuses today. Or narrow the two sentences to "a project whose own tsconfig.json does not set `outDir` `dist` and `tsBuildInfoFile` `dist/.tsbuildinfo`, or that sets `declarationDir` or `outFile`".

### F5 — "refuses a config that loads packages any other way" is broader than the check (low, blocking: a false sentence in the PR body)

**Evidence.**
- [Observed] PR body line 13 says `sync-child-process-guard.test.ts` "now uses the same resolver, and refuses a config that loads packages any other way."
- The check is a text scan of `vitest.config.ts`: `SOURCE_CONDITION` must match and `ALIAS_KEY` (`/\balias\s*:/`) must not (`sync-child-process-guard.test.ts:25-26,73`).
- X2b, a `resolveId` plugin that sends `@syzygy/support` to `packages/support/dist/index.js` with a double-quoted name, passes 69/69. The poisoned-dist probe shows it really loads dist (§3.6).
- X2, the same plugin single-quoted, dies only because `PROJECT_NAME = /\bname:\s*'/g` (`:22`) then miscounts projects. That is an accident of the project-count check.
- [Observed] Hosted CI runs `npm run build` (`node-ci.yml:88`) before `npm test` (`:112`), so every dist exists when the suite runs. [Inferred] No other row catches a redirect there either.

**Failure scenario.** A later config change adds a resolver plugin, which no text predicate here matches. Tests silently read a dist again, which is exactly the hazard this bead removes, and the guard the body describes stays green.

**Proposed fix.** Either one of these:
- Narrow line 13 to "…and refuses a config whose `ssr.resolve.conditions` does not lead with `'source'` or that has an `alias` key."
- Add a behavioural row that proves the claim, for example in `workspace-reach.test.ts`: for every workspace export specifier `s` with source module `m`, `expect(await import(s)).toBe(await import(m))`. Record X2b as its mutant.

### F6 — The PR body lacks the disclosures the third ruling requires, and carries stale or false lines (low, blocking: false sentences in the PR body)

**Evidence.**
- [Observed] The final body (sha256 `603b9aae…`) has no build-window disclosure and no restart-order statement, both required by the third ruling (§2).
- Line 70: "A rerun of the full suite is below." No rerun is below.
- Lines 71–72: "Battery: pending." and "Hosted node-ci: pending."
- Line 41: "5. node-ci and the fresh-clone system test: pending on this head." Hosted `node` and `checks` both pass at 2f249d2c, the fresh-clone test included (§1).
- Line 66: "Node 22.18 runs the clean build" [Unknown]. Not re-run here: local is v24.6.0 and hosted `node-ci.yml:46` uses `node-version: 24`. The engines floor is `>=22.15`.

**Failure scenario.**
- An operator runs `npm run build` while a `syzygy dossier` command is in flight. It fails with a module-not-found error, and nothing in the change record says this was accepted, so they file it as a regression.
- A reader of the merged PR finds "pending" against checks that passed, and a rerun that does not exist.

**Proposed fix.**

Add under "Deviations and interactions":

> - **Build window.** `scripts/clean_build.mjs` removes each built project's dist before `tsc -b` writes it again. While `build` or `build:poc` runs, a concurrent process that imports a module of a project being built fails (`ERR_MODULE_NOT_FOUND`) instead of loading a mix of old and new modules. Measured once at 2f249d2c, at load1 28–30:
>   - `build:poc` took 11.5 s, and some entry was absent for 10.9 s of it. 53 of 54 concurrent `syzygy dossier help` runs failed. `@syzygy/support` was back after 2.2 s and the app's `main.js` after 11.0 s.
>   - `npm run build` also clears `apps/syzygy` and `polaris-dossier`. It took 17.9 s, an entry was absent for 17.3 s (`apps/syzygy/dist/main.js` itself among them), and 187 of 188 concurrent runs failed.
>   - `build:poc` leaves the `syzygy` CLI's and polaris-dossier's dists in place.
> - **Restart order.** `npm run poc:restart` builds nothing. It stops the running daemon and starts the same command from the existing dist, so the daemon is stopped after any build, never before. A rebuild is the operator's separate step and runs while the old daemon still serves. The daemon's modules are already loaded, and it imports no workspace module lazily. Every other `poc:*` command runs `build:poc` first, so two started together can fail each other inside the window.

Replace line 41 with `5. node-ci and the fresh-clone system test: green at 2f249d2c.` Delete "A rerun of the full suite is below." or add the rerun. Replace lines 71–72 with the battery's actual result and `Hosted node-ci: pass at 2f249d2c.` State where Node 22.18 was run, or drop that clause.

### N1 — A symlinked project directory makes the clean build remove a dist outside the checkout (note)

[Observed] Case `symlinked-project`: `packages/c` → `outside/proj` removed `outside/proj/dist/SENTINEL`, exit 0. `tsc -b` would write into that same directory, so the removed tree is the built project's own dist, not something outside it. But the workspace-path predicate reads as a containment check, and it is not one.

Fix: import `realpathSync` from `node:fs`, add a fixture row, and after line 20 add:

```js
  if (!realpathSync(project).startsWith(`${realpathSync('.')}/`)) throw new Error(`${project}: resolves outside the checkout`);
```

### N2 — Load-sensitive 5 s timeouts in polaris-dossier (note, pre-existing)

[Observed] Three timeouts in the absent-dist full run at load1 37–45 (§3.1). They pass alone at load1 29–35 in under 1.8 s. The PR body reports two such timeouts from its own run. No change here touches those files.

Fix: none in this PR. If they recur on hosted runs, raise those rows' timeouts in their own bead.

### N3 — Mutant X3b survives: the clean-build fixture's reference chain is one deep (note)

[Observed] X3b follows references only from the named projects. It leaves `packages/a/dist/stale.js` in c→b→a when c is named, and the suite passes.

Fix: in `product-build.test.ts`'s "the clean build …" fixture, add a depth-2 chain (name only the top project; plant a stale output in the bottom one; assert it is gone). Record X3b as its mutant.

### N4 — Mutant X8 survives: the outside-workspace refusal row names a directory with no tsconfig (note)

[Observed] Row `['names a path outside the workspaces', ['scripts'], '', 'scripts: not a workspace project']` (`product-build.test.ts:102`) still refuses on `existsSync` alone. X8 drops the regex and accepts `tools/x` with a tsconfig, removing its dist.

Fix: give the fixture a `tools/x/tsconfig.json` (with `outDir`/`tsBuildInfoFile` under dist), name `tools/x` in that row, and record X8.

### N5 — Mutant X4 survives: row 1 does not see a test added by `files` (note)

[Observed] Adding `"files": ["src/sha256.test.ts"]` to support's tsconfig emits `dist/sha256.test.js`, and `product-build.test.ts:35` (include/exclude pin) passes.

Fix: in that row, add `expect(config.files, project).toBeUndefined();`, or assert that a clean build's emitted list has no `*.test.js`.

### N6 — The S10 bundle's `conditions: ['source']` has no guard when dists exist (note)

[Observed] Without the condition (and without aliases), the bundle carries 49 workspace dist modules (§3.7). Neither the lane's 17 mutants nor mine target that line, and hosted CI builds before it tests (`node-ci.yml:88,112`). [Inferred] In any built checkout, CI included, dropping the condition leaves the S10 proof green while it proves a dist build.

#545's `sourcesOnly` guard closes this. Fix: keep that guard when merging #545; this PR need not duplicate it.

### N7 — The POC surface version moves (note)

[Observed] `pwbSurfaceVersion` (`walkthrough-inputs.ts:86`), recomputed from the tree ids: `b10e4da9 polaris@df13a4677575` and `2f249d2c polaris@f0232ab663c4`. The app src tree changed in test files only (`build-output.test.ts`, `product-build.test.ts`, `sync-child-process-guard.test.ts`); poc-core's tree is unchanged.
- It is rendered on `/polaris` (`polaris.ts:922,950`) and printed by `poc-main.ts:40`.
- No tracked file at 2f249d2c names `df13a467` (`git grep -F`).
- Other greenfield-parity PRs record the move, for example `docs/evidence/syzygy-bpyt-6-15/summary.json:152-153` (`"base": "polaris@e4fd613eed56"`, `"head": "polaris@3f91047d44cf"`).

Fix: add one line to the PR body or evidence: "The POC surface version moves from polaris@df13a4677575 to polaris@f0232ab663c4 (test files only; no record binds the old one)."

### N8 — Landing interactions with PR #545 and main (note; the third ruling sets #545 first)

[Observed] §3.8. When #549 merges main after #545:
- Keep #545's `await bundleDriver(bundle)` in `no-egress.test.ts`. Adding `conditions: ['source']` to its build options is optional, since #545's derived map already resolves all 18 specifiers to src under this resolver.
- Change `packages/support/src/support-purity.test.ts:116-118` to:

  `expect(manifest['exports']).toEqual({ '.': { source: './src/index.ts', types: './dist/index.d.ts', import: './dist/index.js', default: './dist/index.js' } });`

  The textual merge is clean but this row fails at runtime.
- Exclude `src/**/*.testkit.ts` from support's tsconfig (F1).

Main `95c87a52` needs nothing: its one PR-path change is comment-only, and the merge passes (§1).

### N9 — Stale guidance outside the changed docs (note; bias 7)

[Observed] §3.9.
- `docs/design/POLARIS-M12-RETAINED-EVALUATIONS-FUNNEL.md:1825-1828`: "A core type change requires `tsc -b packages/three-surface-poc-core` before `tsc --noEmit -p apps/three-surface-poc`, or the app reports phantom errors; `build:poc` keeps `tsc -b --force`." This guides open bead `syzygy-dov.12`. At head, `tsc --noEmit -p apps/three-surface-poc` is the product config without `customConditions`, so it reads dist declarations: the old trap.
- `docs/superpowers/plans/2026-08-24-cap1-runtime-hardening-followups.md:910-911`: "Vitest's explicit source aliases are the only no-prebuild path. Node and TypeScript consumers use built JavaScript/declarations." Also lines 854 and 970. This guides open epic `syzygy-u2a`, and the path is pinned (AGENTS.md: do not move).
- `openspec/changes/three-surface-poc-experience/tasks.md:42` (`tsc -b --force` build) is signed off and amendable only via CC-REV-2. It is a remainder, not editable here.

Fix: first hash each file and grep the manifests and raws for it (AGENTS.md). Then append a dated mark at the stale sentence, for example: "(Stale since 2026-10-28, `syzygy-bpyt.4.2`: `npm run typecheck` reads no dist declaration and needs no build first; `build:poc` runs `scripts/clean_build.mjs`, with no `--force`.)" For the u2a plan: "(Stale since 2026-10-28, `syzygy-bpyt.4.2`: tests, the typecheck and the no-egress bundle load workspace packages by the `source` export condition; Vitest has no aliases.)"

### N10 — The clean build's error for a commented tsconfig names no file (note)

[Observed] Case `tsconfig-with-comment`: exit 1 and nothing removed, so it fails closed. But the error is a bare JSON `SyntaxError`, while tsc accepts JSONC.

Fix: F4's TypeScript-parse option removes it. Otherwise replace line 21 with:

```js
  let config;
  try { config = JSON.parse(readFileSync(path, 'utf8')); } catch (error) { throw new Error(`${path}: not plain JSON (${error.message})`); }
```

## 5. Changed outputs

- **Product JavaScript.** [Observed] 253 `.js` at head. 252 are byte-identical to base, and `workspace-reach.testkit.js` differs (an F1 member). No test `.js` is emitted. The 3 non-test modules of cap1-conformance and cap1-system are no longer built, which is disclosed.
- **Product declarations.** [Observed] `packages/polaris-dossier/dist/cli.d.ts:81` differs (F3, undeclared). The testkit's `.d.ts.map` and `.js.map` differ (edited source). All other `.d.ts` and maps are identical.
- **Manifests.** [Observed] 17 export entries gain a first `source` condition, which is declared. 14 keep their `import`, `default` and `types` unchanged. The app's 3 entries change from a bare dist string to `{ source, default }` with the same dist target, which the PR does not describe separately. [Inferred] That is equivalent for Node.
- **Build scripts.** [Observed] Root `package.json` `build` and `build:poc` run `node scripts/clean_build.mjs …`, and no script has `--force`, as declared. New tooling refusal strings live in `clean_build.mjs` only. No product refusal string or exit code changes: the stale-dist arms' probe output is unchanged.
- **Build-time behaviour.** [Observed] The build window (§3.5) is new, accepted by the third ruling, and undisclosed (F6).
- **Gate behaviour.** [Observed] The observer-input gate's code is unchanged, but its effective coverage of the build definition narrows (F2).
- **S10 bundle.** [Observed] Byte-identical, `18172eb2…`.
- **Rendered bytes.** [Observed] The POC surface version string moves (N7). No other rendered byte changes: the product JS is identical apart from the test kit.
- **Governance output.** [Observed] Only the CG-2a examined count and file-scope counts move.

## 6. Acceptance criteria

| AC | Verdict | Basis |
|---|---|---|
| 1. No emitted dist file is a test (count before/after) | **Met** | [Observed] Base 264 test `.js` of 520; head 0 of 253, and the same for `.d.ts` and maps (§3.3). Test-support modules are not tests; they fall under AC4. |
| 2. No `--force`; `build-output.test.ts` deleted with its hazard eliminated | **Met** | [Observed] No script contains `--force`; the file is deleted; the `build:poc` arm is identical to a clean build with the probe unchanged (§3.4). F4's two gaps are unreachable in today's tree, but they are where the hazard could return. |
| 3. No per-package aliases; tests pass with every dist deleted | **Met** | [Observed] No `alias` key in `vitest.config.ts`. Absent-dist suite: 3 load timeouts, each file passing alone; poison-dist suite 5520/0 (§3.1). |
| 4. Typecheck is a real noEmit check including tests; `npm run build` emits product only | **Typecheck half met; build half not met** | [Observed] Root noEmit program over `apps/*/src`, `packages/*/src` and `packages/*/test-support`, passing poisoned and absent. The build emits 36 test-support files (F1). |
| 5. node-ci green; fresh-clone system test green | **Met** | [Observed] Hosted `node pass 4m0s`, `checks pass 18m13s`, system `51 passed (51)` including fresh-clone (§1). The PR body still says pending (F6). |

## 7. Test quality

- **Net delta.** [Observed] "+15 ~6 −1" re-derived: `product-build.test.ts` has 9 rows, `workspace-reach.test.ts` gains 6, and `build-output.test.ts` (one 42 s row, 240 s timeout) is removed. The replacement runs in seconds and covers the same hazard (stale outputs) plus refusals. That passes test-rigor bar 10 (:93–97).
- **Kills.** [Observed] The lane's 17 mutants are all killed by assertion-type failures in their target rows. No timeouts.
- **Literals.** [Observed] Expected values are literals, such as row 1's `[['src'], ['src/**/*.test.ts']]` and the refusal strings, or independently derived, such as the source-entry identity via the compiler's own `.js.map` (bar 4, :64–67).
- **Gaps.** Bar 3 (:60–63) asks for failure and edge paths proportional to blast radius. `clean_build.mjs` deletes files, and its suite misses:
  - a reference chain deeper than one (N3)
  - an outside path that has a tsconfig (N4)
  - a cycle and a `declarationDir` (F4)
  - a symlinked project (N1)
  - a test reached by `files` (N5)
- **The guard row.** `sync-child-process-guard`'s config scan is a text predicate whose one kill on a redirect is incidental (X2), while X2b survives (F5). By the core rule (:42), a resolution guard that a plausible redirect passes protects less than its sentence claims.
- **S10.** The S10 resolution line has no guard (N6).
- **Product-only claim.** No row checks it beyond `*.test.ts` (F1).

## 8. Cleanup

[Observed] I deleted the scratch clones `rev-549/head` and `rev-549/base`, and the TMPDIRs `/tmp/r549-1`, `-2`, `-3`, `-4`, `-6`, `-7` and `-9`. `-5` and `-8` were already removed by their own runs. `ls -d /tmp/r549-*` now lists nothing.

I deleted the bulky or forbidden results: the full-suite JSON reports and logs (summarised in `full-suite-summary.json`), the governance, quotation and typecheck logs, the four PR-body reads, the `alone-*` reports, empty `.err` files and a status file.

I killed no process; none of mine was left running. Kept: 37 files, the largest `doc-sweep-head.json` at 145,832 bytes. None is over 300 KB.

| Path (relative to `rev-549/`) | sha256 |
|---|---|
| `build-window-build.json` | `3cdf41047f5d88d8df3f8ee28ec93099fc5f55c8e058ad47ff08135bd2addc75` |
| `build-window-poc.json` | `02f04c0d3f722ed06ed9028b1fa12bc2879c0f39deacf5f3d4b6387092f53f6a` |
| `clean-build-refusals.jsonl` | `87c8bbd9e9419a8704a77da9de5dcb7a09689e174ef107d12326fcb963ab7ece` |
| `dist-sweep-head.json` | `a8a83802965ebc04522f7ec568a217c37dfcaa1dd39d19b0dbe682d3158b4884` |
| `doc-sweep-head.json` | `20c726ff87f37eb3389265615363f2f6501513438c30f6fc1df606d207a9d344` |
| `emit-compare.json` | `e3bca5d11efb8211c24000468fa66d5d7dfc753cdfa7a97961a846bec4ed92c9` |
| `full-absent.loadavg` | `5b2a2a86166ea1a3e11624b98b8fa8adb4ea0a2cdb1d93e71c03dfd028d4bc05` |
| `full-poisoned.loadavg` | `312f5a74646d1cae79f01a28c94d34464e33cee5a89f2be86dcc81973ce82172` |
| `full-suite-summary.json` | `63609a149867dff5e351b8834d31a54dba92cefeb0cd75bbe52416bd7728f977` |
| `lane-mutants-messages.json` | `00c0790a70190fad1b5c26ebc148a48b810802bc506f72a43d04baa79095c7b4` |
| `lane-mutants-rerun.json` | `f38de1e7d6b61824dd0540e2ab654091b39bbe99cdc64e105339fc5918824d92` |
| `lane-mutants.loadavg` | `1b8833889fe97cbf0e2cc9cede1710a12d0744c08e596ed12f7e5bc60a77851a` |
| `main-merge-tests.json` | `13be5378cc9b4a2079fce40c400ab628dc199a8c81eadf889aae0fa8413353b5` |
| `merge-tests.json` | `0de30acb33ebe049ea424abc86aad8ca730deca2fa617931b683a9b451d8cfc0` |
| `product-reach-head.json` | `78db3c47765e5d458a8b509daeace12016e5d84608a35dbed57ac396d449b2a4` |
| `reviewer-mutants.json` | `63358e7043ded3aa03c9d130249ba8e6e68c785b09875b3efb18922c8c60e14b` |
| `s10-bundle.jsonl` | `6c0d4b722dc309baed1d01eb66f1b4001db47a3761103c7aff1e47541b1b21b0` |
| `source-entry-identity.json` | `8e3b98a4306b99c07bcabf1381dc90649e0723e0a4194fb64e73ab49c1ef0556` |
| `stale-dist-rerun.json` | `c8e23557778de3ee89113a519590d5d631c217479bf04971973d6df7c6d7e32c` |
| `survivor-probes.json` | `ce5c5c315d540ad59e75935b3352cded8fa7c0db8e883dcedae846bd35ceb652` |
| `tools/build_window.py` | `d40b15969bf9ceffba9b33967f34c8d09249068900c6297fb6c4156bfa8d8d9f` |
| `tools/clean_build_refusals.py` | `542d00e5771fd3d033f04952c9a03a87ff68782196951c4a843aab2ee1011416` |
| `tools/closure_check.py` | `c92028a85f924170b35da1f429af708f3115d97c32e692fbe46b94b4f0c42494` |
| `tools/compare_emit.py` | `075dcb1dfaf19b1ad60fe555fd72c63afcbf9705d47f3d04bd97f1b513d3f80d` |
| `tools/dist_reader_sweep.py` | `c014886315d9cd63baf3725ff38b60eea4d4d8c4355f81f6695fd20e33abbafd` |
| `tools/doc_sweep.py` | `85026beb0f35b3d19b80aba749771740b60120dc63f68a8bee028e3e1b6909c4` |
| `tools/lane_mutants_messages.py` | `7e0f91a11f988e7d74aeecf14c5be9b5b36be99453f605cc83fb85310a260f32` |
| `tools/poison_dists.mjs` | `acace6e72c6fafe049cc792b92022174aa596c27956cb9e409367c4c79c31520` |
| `tools/product_reach.mjs` | `ed0d2a2827b87fd91d54f900cb14270b095f76b3fd3af74bdef413a614abe875` |
| `tools/reviewer_mutants.py` | `5dfd3f210d1fc0d71d0b48056724bbdd45595d17e1b9da971b900caa29641815` |
| `tools/s10_bundle.mjs` | `d9a96de99cc546538e4fa13e3db00dd9b80dbea2c80c00428709a597e7f81341` |
| `tools/source_entry_identity.py` | `1391cebbc5a421528cf46e87fac64f867d0fd5279835f4fe513f4bf2d3cc984d` |
| `tools/survivor_probes.py` | `9b795e1b98279617d67cbd4790974fa45cbca5b4d8609a23ea9a01c1564f690d` |
| `tools/toplevel_conditions_probe.py` | `6caa53fccbd4c1bf08f0354da5af98acac273a2a754a97eb63297bc43fbbb6a3` |
| `tools/x2b_probe.py` | `19c2951edf7fccd16a68f30a3137dc156738e268c95f21a03a9c248317f5d98f` |
| `toplevel-conditions-probe.json` | `6888c9951d1112d60163555e95d794d4f2dcc11d403f8449d1c404a45011dc64` |
| `x2b-probe.json` | `de077d048a032ce8fe7a459355c6708dc491b1f8251d3db11ceda289741d4ff5` |
