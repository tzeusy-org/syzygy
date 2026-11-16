# R-GP-IMPL-SUPPORT-LEAF-GUARDS-2 — CC-REV-1 implementation review of syzygy-bpyt.6.14, round 2
Verdict: REVISE
Reviewed commit: ecea355b
Subject: r2-review.diff sha256 00a785f11fddd491890552cb6a22146999eac3215b8635fe1110f0288580f29d

Reviewer: fresh-context CC-REV-1 reviewer (Claude Opus 5.5), 2026-10-28. I did not author the change or its round-1 repairs. I
changed no pull request, branch or worktree, pushed nothing, commented nowhere and dispatched no workflow. I fetched no target
repository content: every run used this repository's sources and the S10 fixture clone that `makeClone` builds. I opened no
credential file and nothing under `~/.claude/` or `~/.config/`. Paths are relative to the repository unless they name
`rev-545/` or `rev-545-r2/`, which are directories in
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/`.

Verdict in one line: the seven round-1 fix texts are in place byte for byte and do what round 1 asked for every form round 1
named. Two things still block, both cheap to fix:
- **F1 (PR body).** The R2 residual states a false mechanism ("neither the reader nor the `import(` token reads a call with a
  space before the parenthesis"). The reader does read such a call. With a literal `node:crypto` specifier, that space
  exports all of `node:crypto` through the leaf, and every row passes, the new createHash row included. Two forms do it (V9,
  V7), and the body does not disclose them.
- **F2 (code).** The new N1 fixture row survives three one-line weakenings of what its title claims: the `x` forms dropped
  from the extension filter (W5), and the exclusion broadened (W6, W7). With W6, one ordinary module, `latest.ts`, exports
  `randomUUID` from a passing, building leaf.

N1 to N6 are notes.

## 1. Subject identity checks

Every digest here was computed by script (rule 3).

| Check | Result |
|---|---|
| Round-1 raw, `sha256sum rev-545/R-GP-IMPL-SUPPORT-LEAF-GUARDS-1-RAW.md` | `bf317e35fd05a21b6c1b9a22911f22fdcd0545c9a2b61187a31bcfa16b4d98c4`: **matches** the brief [Observed] |
| `sha256sum lead/b614/r2-review.diff` | `00a785f11fddd491890552cb6a22146999eac3215b8635fe1110f0288580f29d`: **matches** [Observed] |
| `git diff 5995aa3c ecea355b \| sha256sum` | the same digest; `cmp` against the subject file prints "identical"; `--shortstat`: `20 files changed, 2772 insertions(+), 1445 deletions(-)` [Observed] |
| `git diff 5995aa3c ecea355b -- packages \| sha256sum` | `021461957853407a6d92231dfc880d2cf606f17736c6065c74915489b2aaeb76`: **matches**; `2 files changed, 70 insertions(+), 4 deletions(-)` [Observed] |
| `git diff --stat 62499514 ecea355b -- packages` | empty: the evidence head changes no package path [Observed] |
| PR body (`gh pr view 545 -R Tzeusy/syzygy --json body --jq .body > file`) | `f785665c78966b2dde4b41d8d1799e43fe258312b14e10ca4972ad75326d2c79`: **matches**, and `cmp` with `lead/b614/body-r2.md` is identical. Re-read by pipe before writing this raw: the same digest [Observed] |
| PR head (`gh pr view 545 --json headRefOid,state,mergeable`) | `ecea355ba96b0082ad8aad11e9799518f87c2e19`, OPEN, MERGEABLE [Observed] |
| Branch commits `5995aa3c..ecea355b` | `62499514` ("test: the PR 545 round-1 repairs, the reviewer's fix texts verbatim") and `ecea355b` ("docs: re-run the 6.14 evidence at the round-1 repair head 62499514") [Observed] |
| GitHub `main` / merge base with `ecea355b` | `b10e4da9a57a472cb6820ef7dea0a05a5dddc0ce` / `f7ea858480b30ffc4407154a84d1d03f3fe4a549` [Observed] |
| PR body edit history (GraphQL `userContentEdits`) | 2 versions: 2026-10-27T16:32:10Z (round 1's) and 19:13:07Z (the current one, which equals the frozen body less `gh`'s trailing newline) [Observed] |

**Main since `f7ea8584`.** `git diff --name-only f7ea8584 b10e4da9` lists 443 paths (`rev-545-r2/main-changed.txt`) [Observed]:
- **PR paths:** 0 of the PR's 30 (`comm` of the two sorted lists) [Observed].
- **Manifests:** 0 of the 13 `package.json` files (12 workspaces and the root). No `package-lock.json`, `tsconfig*` or `vitest*`
  file changed [Observed].
- **Implementation paths:** 15 [Observed]:
  - 12 tests:
    - `apps/three-surface-poc/src/`: `capture-test-artifact-main.test.ts` and `main.test.ts`;
    - `apps/three-surface-poc/src/polaris-generation/`: `generation-mutation.test.ts`, `redis-shaped-discovery.test.ts` and
      `self-corpus.test.ts`;
    - `packages/cap1-system/src/daemon-entry-unchanged.system.test.ts`;
    - `packages/polaris-dossier/src/git-object-reader.test.ts`;
    - `packages/polaris-generation-core/src/`: `dossier-evaluation.test.ts`, `dossier-profile.test.ts`, `excerpt.test.ts` and
      `workspace-reach.test.ts`;
    - `packages/three-surface-poc-core/src/test-artifact-verification.test.ts`.
  - 2 product modules: `apps/three-surface-poc/src/polaris-generation/generation-mutation.ts` and
    `generation-mutation-run-main.ts` beside it.
  - 1 testkit: `packages/polaris-generation-core/src/workspace-reach.testkit.ts`.
  - 12 + 2 + 1 = 15, every line of `grep -E '^(packages|apps)/'` over the 443 paths.
- **What the S10 bundle reads:** I bundled the driver with esbuild's metafile, using the oracle row's literal 18-entry alias map
  (which the test pins equal to the derived map) and `bundleDriver`'s entry and options (`tools/bundle_inputs.mjs`). That gives
  198 inputs, of which 126 are workspace files. **0 of the 126** are among the 443 [Observed, `bundle-inputs-merge.json`].
- **What the alias derivation reads:**
  - the 13 manifests: 0 changed;
  - the 18 entry files the oracle names: 0 changed;
  - `workspace-reach.testkit.ts`: changed by #541's four commits. All 17 changed lines are doc-comment lines (` *` or `/**`),
    and 0 are code (by script over `git diff -U0`) [Observed].
- A local merge of `b10e4da9` with `ecea355b` (`115933f2`) is clean [Observed].

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md`, at `ecea355b`):
- `:18-20`: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- `:35-37`: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam
  (VIS-7);" and "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- `:51`: "**A reviewer or the owner** may reclassify at any time."
- `:57-58`: "Per the canonical bar, if the reviewer authors semantic fixes, the exact resulting head gets fresh independent review."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
- `:52-55`: "'Behavior-preserving' means none of the following changes: a rendered byte, a wire format, a refusal string or an exit
  code; a signed or digest-bound artifact; a consent, security or retention decision."
- `:60`: "Each pull request states which CC-REV-1 classes it touches."
- `:62`: "pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security)".
- `:64-66`: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose; a rule-6 mutant
  for each predicate; a non-blocking owner notice in the cycle report."
- `:95-96`, the stop clause: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**AGENTS.md at `ecea355b`:**
- rule 2 (`:120-121`): "No 'zero / all / 100%' claim without running that exact sweep this session, confirmed by a second
  method";
- rule 6 (`:126-127`): "Mutate the input and confirm the check fails, per predicate, before trusting it";
- rule 9 (`:132`): "A claim of absence needs a sweep with a denominator.";
- rule 10 (`:133`): "Freeze the bytes a review is bound to; any later edit retires the review.";
- the support note (`:184-186`): the package is "a leaf with no workspace dependency, imported by the PWB core, the Polaris
  generation packages, the dossier and the POC app."

**Test-rigor bar** (`git show ecea355b:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
- `:42`: "**A test is worth keeping only if some plausible bug makes it fail.**"
- `:64-67`, bar 4: "Expected values are literals or independently derived."
- `:82-84`, bar 7: "Test names state expected behavior … A maintainer should localize the bug from failure output alone."
- `:93-96`, bar 10: "A test is worth *adding* only if it catches a plausible bug no existing test catches … Reviews state the net test
  delta".
- `:103-104`, workflow step 2: "name a one-line bug in the code under test this test would *not* catch but should."

**Class ruling.** The repair changes neither class:
- **Class 4 stays.** The pull request remains the verification of an egress path (S10), plus the purity guard that egress-relevant
  code inherits.
- **Class 3 stays, as round 1 added it.** The guard keeps `sha256`, `deepFreeze` and `decodeUtf8` deterministic.
- **Not class 1.** The two changed files are tests [Observed, diff paths].

GP-Q0's three further checks, for this round:
- **The differential:** the S10 bundle is byte-identical, and 502 of 502 non-test `dist/` files are identical (§5).
- **A rule-6 mutant per predicate:** my rows below, one or more per new row, and a stated sample of the lane's.
- **The owner notice:** the coordinator's to write.

**Does anything a gate accepts or refuses change?** No [Observed: no product byte changes, §5]. The two test guards refuse more
than at `5995aa3c`: Y7, Y9 to Y12, Y14, T1, K4, Y6 and G0 are now killed. Round 1 ruled, and the coordinator's comment on
`syzygy-bpyt.42` agrees, that a test guard is not a gate, and that F1's widening is inside the bead.

My F2 fix adds fixture entries only. It refuses nothing new in any source today: it pins the scan.

N4's optional hardening is different. It would make a test guard refuse R2's whole class, which the PR body says this PR does
not refuse. That is a scope call for the coordinator. If the stop clause is read to cover test guards, it goes to the owner as
one question. Either way, no product gate is involved.

## 3. What I ran, and the results

Everything ran in my own clones under `rev-545-r2/`:
- `head`, at `ecea355b`;
- `merge`, at `115933f2`, which I later checked out at `5995aa3c` for the `dist/` comparison.

Each clone had `npm ci` ("added 117 packages"). Each run used a private TMPDIR, `/tmp/r545b-1` to `/tmp/r545b-8`, all since
deleted. I ran one vitest process at a time. `load1` is from `/proc/loadavg`, on a 12-core host.

| Run | load1 | Result (verbatim where quoted) |
|---|---|---|
| `tools/fidelity.py`: each `rev-545/tools/fix-*.ts.txt` against the two files at `62499514`, then every added and removed line accounted for | n/a | All 7 blocks occur exactly once verbatim, and 0 occur at `5995aa3c`. Added lines: 57 + 13 = 70. Removed lines: 2 + 2 = 4. `unaccountedAdded: []` and `unaccountedRemoved: []` in both files. Every added line is a block line or one of the import or signature lines round 1's prose names. 0 U+00A0 in any block or file [Observed, `fidelity.json`] |
| Placement against round 1's `fix_check*.py` anchors | n/a | The F1 function follows `identifiersOf`'s `return [...names].sort();\n}`. The N1 row precedes the specifier test. The F1 row and then the N3 row precede the forbidden-token test. The N2 row opens its describe and is followed by one blank line. The N4 row precedes "fails the bundle when an @syzygy specifier resolves outside them" [Observed, reading the anchors and `support-purity.test.ts:43-107,140-147`, `no-egress.test.ts:66-72,169-180`] |
| `reviewer_r1_fragments.py` (the lane's), re-run over `rev-545/` | n/a | Output byte-identical to the committed `reviewer-r1-fragments.json` (sha256 `2ff98a8d5624ffcd7c073a39857ff23b5f7c69f8b189ec8f326bc5db0159c977`). Its 4 record digests equal round 1's §8 table rows, by regex over the raw, and equal the files' live hashes [Observed] |
| `summary.py . --check` and `--selftest` at `ecea355b` | n/a | `check: summary.json matches its inputs and no check fails`; `selftest: all 19 mutations caught`. `summary.json` sha256 `ae55a41b…7b44`, as the body says [Observed] |
| The two files at `ecea355b`, every `dist/` absent | 21.81 → 25.18 | `total 40 passed 39 failed 0 pending 1 files 2 failedFiles 0 success True`: support-purity 33, and no-egress 6 passed with 1 skipped (the no-strace arm) [Observed] |
| `npm run typecheck` from no `dist/` (it is the build command) | 28.01 → 27.02 | exit 0; 12 `dist/` [Observed] |
| The two files, all twelve `dist/` built | 26.78 → 27.10 | `total 40 passed 39 failed 0 pending 1 … success True` [Observed] |
| `tools/r2_mutants.py … absent all`: the lane's sample plus my 33 rows | 24.25–37.12 | `summary {'rows': 48, 'asExpected': 48, 'unexpected': []} status after '' leftovers []` [Observed] |
| The same, all `dist/` built | 24.37–52.29 | `summary {'rows': 48, 'asExpected': 48, 'unexpected': []} status after '' leftovers []`. Every observation and every failing set equals the dist-absent run [Observed] |
| `… extra` (round 1's Y1, Y8, Y3, Y5b and Y5c, read by id from `rev-545/rev-mutants-head-present.json`, plus V7n and V9n), both dist states | 43.09–54.34 / 35.79–37.48 | `{'rows': 7, 'asExpected': 7, 'unexpected': []}` twice, with identical observations [Observed] |
| `tools/build_probe.py`: `tsc -p packages/support` into a TMPDIR under six rows, then the emitted `index.js` loaded | 31.63 | See F1, F2 and N6. V0 exports `["decodeUtf8","deepFreeze","sha256"]`; `status after ''` [Observed, `build-probe.json`] |
| `reader-probe.json`: the committed testkit's `specifiersOf` (imported from `purity.testkit.ts` by Node v24.6.0 type stripping; sha256 equal to `git show ecea355b:` of it) | n/a | `import ('node:crypto')` → `["node:crypto"]`; `require ('node:crypto')` → `["node:crypto"]`; `void import (value);` → `[]`; `import ('node:fs')` → `["node:fs"]` [Observed] |
| `tools/w6_probe.py` | ~33 | W6b-head is killed by the createHash row. W6b survives, `tscExit 0`, and the built leaf gives `["function",true]` (`randomUUID` is a function, and two calls differ). W6b-fixB is killed by the N1 row alone [Observed] |
| `tools/fix_check_r2.py`: my proposed fixes, all dist built | ~30–37 | `summary {'rows': 17, 'asExpected': 17, 'unexpected': [], 'buildsExit': {'B': 0, 'N': 0}} status after ''` [Observed]. A first attempt stopped at FN-Q2 on an `AssertionError` in my own tool: I had mistyped the mutation target, which occurred 0 times. The fix edit was restored (`git status` empty). I corrected the target and re-ran the whole tool, and the record is that re-run |
| Full suite once at `ecea355b`, all `dist/` built (`npx vitest run`) | 36.00 at start, 41.23 at end | `total 5528 passed 5522 failed 1 pending 5 files 253 failedFiles 1 success False` [Observed] |
| …the failed test | (suite) | `start-gates.test.ts`, "init: a run that passes every start gate pins the consented HEAD, records the subject and writes only run.json under the state root". It failed at 5521 ms against the 5 s default, with `Error: STACK_TRACE_ERROR`. In vitest 3.2.7 that is the timeout error from `withTimeout`/`makeTimeoutError`, which carries the test-site stack [Inferred from `@vitest/runner` `chunk-hooks.js:638-641,2005-2011`] |
| …that file alone | 40.15 → 37.23 | `total 104 passed 104 failed 0`; that test took 2,058 ms [Observed] |
| The merge `115933f2`, every `dist/` absent: `packages/support`, `owner-act-drafter.test.ts`, `no-egress.test.ts`, `workspace-reach.test.ts` | 36.55 → 36.96 | `total 113 passed 112 failed 0 pending 1 files 7 failedFiles 0 success True`. support-purity 33, no-egress 6 passed and 1 skipped, workspace-reach 54, drafter 3, decode-utf8 6, deep-freeze 6, sha256 4 [Observed] |
| The lane's `bundle_differential.py` over `head` (dist built) and the merge (dist absent) | 36.88 → 36.65 | `"identical": true`; both `935757` bytes, sha256 `18172eb2e96de6bb703c3c7110d61d5896853d2c865c2a609e9703dca79b3340`, exit 0, 6 passed [Observed] |
| Round 1's `dist_compare.py`: `5995aa3c` built against `ecea355b` built | 34.47 → 33.07 | `A files 502 B files 502 common 502 identical 502 differ [] A only [] B only []`. `package-lock.json` is equal at `5995aa3c`, `ecea355b` and `b10e4da9` [Observed] |
| `python3 scripts/check_governance.py` at `ecea355b` | — | exit 0; `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted` [Observed] |
| `python3 scripts/check_quotations.py` at `ecea355b` | — | exit 0; `OK    QC-1  a quotation beside a path:line locator was said by that file — 40 quotations examined in 21 of 979 .md files scanned (loc-paren-quote 3, loc-colon-quote 26, quote-paren-loc 11), 0 findings` [Observed] |
| Workspaces at `62499514` (`git ls-tree -z` of `packages/*/package.json` and `apps/*/package.json`, the root `workspaces` globs) | n/a | 12 manifests, and 0 names outside `@syzygy/`. The body's "0 of 12" is true. No committed record re-derives it [Observed] |
| Hosted, `gh pr checks 545 -R Tzeusy/syzygy`, at 2026-10-28T04:16:24+08:00 | — | `checks	pass	20m29s` and `node	pass	4m44s`. Both runs are for `ecea355b` (governance-docs, node-ci). `node-ci.yml` runs `npm run build` (`:88`), `npm run typecheck` (`:92`) and `npm test` (`:112`) [Observed]. At 03:31 `checks` was `pending` |

**The lane's sample.** 15 of `mutants.py`'s 49 head rows, read from its own `ROWS` table with its own expectations: C0, RP8, L1,
T1, Y7, Y9, Y10, Y11, Y12, Y14, K4, Y6, M2, M5 and G0. For the 11 prefixes that `summary.py`'s `KILLED_BY` names, each failing
set equals the one row given there, in both dist states [Observed].

**Every kill I rely on is an assertion or a named build error, not a timeout.** Of the 37 killed rows per dist state (33 + 4),
0 carry a "timed out" message [Observed, by script]. The file-level and bundle kills read as follows:
- **M2:** `[plugin: workspace-sources-only] @syzygy/leak resolves outside packages/*/src and apps/*/src: packages/leak/index.js`.
- **G0, M5 and G2's first row:** `expected [Function] to throw error including '@syzygy/support resolves outside pack…' but got 'Build failed with 41 errors…'`.
- **G1:** `promise resolved "undefined" instead of rejecting`.

**My rows, every one as expected in both dist states.** "Alone" means that row and no other fails [Observed]:

| Id | Mutant | Result |
|---|---|---|
| V1 | `import 'node:crypto';` in `index.ts` | killed by the createHash row alone |
| V2 | `import value from 'node:crypto'; export { value };` (a default import under an allowed name) | killed by the createHash row alone |
| V3 | `export * from 'node:crypto' with { 'type': 'json' };` (an attribute form, string key) | killed by the createHash row alone |
| V4 | `import type { value } from 'node:crypto';` | killed by the createHash row alone |
| V5 | `export type * from 'node:crypto';` | killed by the createHash row alone |
| V6 | `declare module './sha256.js' { export * from 'node:crypto'; }` (a nested module block) | **survives**; `tsc` refuses it (N6) |
| V7 | `import value = require ('node:crypto'); export { value };` | **survives**, and builds (F1) |
| V7n | V7 without the space | killed by the forbidden-token row alone |
| V8 | `export { createHash };` in `sha256.ts`, re-exported by `index.ts` | **survives**, and builds (N1) |
| V9 | `export const value = () => import ('node:crypto');` | **survives**, and builds (F1) |
| V9n | V9 without the space | killed by the forbidden-token row alone |
| V10 | `export { createHash as value } from 'node:crypto';` | killed by the createHash row alone |
| V11 | `src/io/value.mts` holding `export * from 'node:crypto';` | killed by the createHash row alone |
| V12 | `src/value.tsx` holding `export * from 'node:crypto';`, plus `export * from './value.js';` | killed by the createHash row alone |
| Q1 | `moduleDeclarationsOf` narrowed to `ts.isImportDeclaration` | **survives** (N2) |
| Q1Y7 | Q1 plus Y7 | **survives**: round 1's F1 reopens (N2) |
| W1 | `sourcesUnder` without `recursive: true` (no L1) | killed by the N1 row alone |
| W2 / W3 / W4 | the filter narrowed to `/\.ts$/u` / `/\.[jt]sx?$/u` / `/\.[cm]?tsx?$/u` | each killed by the N1 row alone |
| W5 | the filter narrowed to `/\.[cm]?[jt]s$/u` (the `x` forms dropped) | **survives** (F2) |
| W5V12 | W5 plus V12 | **survives** the tests; `tsc` refuses it (F2) |
| W6 | `!name.endsWith('.test.ts')` → `!name.includes('test')` | **survives** (F2) |
| W7 | `name !== 'purity.testkit.ts'` → `!name.endsWith('purity.testkit.ts')` | **survives** (F2) |
| K5 | the shared `/\bprocess\./` narrowed to `/\bprocess\.env/` | killed by the literal row alone |
| K6 | `os` dropped from the module token | killed by the literal row alone |
| U1 | `Object.freeze &&= (value) => value;` | killed by the no-write row alone |
| U2 | `Object.values += '';` | killed by the no-write row alone |
| U3 | `Object['freeze'] = (value) => value;` | killed by the no-write row alone |
| U4 | `[Object.freeze] = [(value) => value];` | **survives** (N3) |
| U5 | `({ value: Object.freeze } = { value: (bytes) => bytes });` | **survives** (N3) |
| Q2 | the write visitor's `ts.isElementAccessExpression` arm dropped, plus U3 | **survives** (N2) |
| G1 | `bundleDriver` ignores its `aliases` (`alias: workspaceAliases(),`) | killed by the N4 row alone |
| G2 | the guard tests only `resolved.external` | killed by the N4 row and the guard's self-test row |
| r1:Y1, r1:Y8 | round 1's | both killed. Y8 is now also killed by the createHash row |
| r1:Y3, r1:Y5b, r1:Y5c | round 1's | all survive, as the body discloses |

The assignment range `FirstAssignment..LastAssignment` in TypeScript 5.9.3 spans all 16 assignment operators: `=`, the eleven
arithmetic and bitwise compounds, `||=`, `&&=`, `??=` and `^=` [Observed, by enumerating `ts.SyntaxKind`].

## 4. Findings

### F1 — blocking (PR body). The R2 residual misstates the reader, and the residuals omit that R2's space with a literal `node:crypto` specifier exports the whole module past every row, the new createHash row included

- **Severity:** medium for disclosure; no product byte is involved. It is blocking under the verdict rule's "a false sentence in
  the PR body".
- **Evidence:**
  - The body's Residuals say (line 99 of the `gh` output): "R2 is `import (value)`, with a space and a computed specifier:
    `value` is on the list, and neither the reader nor the `import(` token reads a call with a space before the parenthesis."
    This sentence is unchanged since round 1's body version (16:32:10Z), and round 1 did not flag it.
  - The reader's third pattern is `/\b(?:import|require)\s*\(\s*['"`]([^'"`]+)['"`]/g` (`purity.testkit.ts:12`). It admits
    whitespace before the parenthesis. Run on the committed testkit, `specifiersOf` reads `import ('node:crypto')` and
    `require ('node:crypto')` as `node:crypto`, and `import ('node:fs')` as `node:fs` [Observed, `reader-probe.json`].
  - So R2 escapes the reader because its specifier is computed, not because of the space. The clause about the reader is false.
  - **V9**, `export const value = () => import ('node:crypto');` in `index.ts`:
    - It passes all 33 rows in both dist states.
    - `tsc -p packages/support` exits 0.
    - The emitted leaf exports `["decodeUtf8","deepFreeze","sha256","value"]`, and `(await value()).randomUUID` is a function
      whose two calls differ [Observed, `build-probe.json`].
  - **V7**, `import value = require ('node:crypto'); export { value };`:
    - It passes all 33 rows in both states, and `tsc` exits 0.
    - The emitted `index.js` begins `import { createRequire as _createRequire } from "module"; const __require = _createRequire(import.meta.url);`
      and ends `const value = __require("node:crypto"); export { value };` [Observed].
    - So the leaf loads `module` and exports all of `node:crypto`. `moduleDeclarationsOf` reads `ImportDeclaration` and
      `ExportDeclaration` but not `ImportEqualsDeclaration`.
  - **Both need the space.** V7n and V9n, without it, are killed by the forbidden-token row alone [Observed]. So both are R2's
    class, and need the deliberate evasion the body assigns to review. Not refusing them is the PR's stated position, and I do
    not dispute it.
  - What is wrong is the disclosure. The body names R2's class only with a computed specifier, and gives a false mechanism for
    it. Meanwhile the new row's title says "takes only createHash from node:crypto".
- **Failure scenario:**
  - A reviewer of a later support change trusts the residual list. They see `import ('node:crypto')` or
    `import x = require ('node:crypto')` in a diff, and do not recognise it as the disclosed class.
  - The leaf then exports `randomUUID`, and every row is green.
  - The owner-act drafter's guard admits any `@syzygy/support` specifier, so randomness reaches it as Y14 showed in round 1
    [Inferred from Y14's shape; not run with V7 or V9].
- **Proposed fix (exact PR-body text).** In "Residuals", replace the R2 sub-bullet with:

  > `  - R2 is `import (value)`, with a space and a computed specifier: `value` is on the list, the reader reads only a string-literal specifier, and the `import(` token does not match a call with a space before the parenthesis.`

  Insert after the "R2's class includes a newline …" sub-bullet:

  > `  - R2's space also passes with a literal specifier, which the reader reads and admits: `export const value = () => import ('node:crypto');` (V9) and `import value = require ('node:crypto'); export { value };` (V7, which `tsc` emits through `createRequire` from `module`) each build and export the whole of `node:crypto`, `randomUUID` included, with every row green, "takes only createHash from node:crypto" among them (review R-GP-IMPL-SUPPORT-LEAF-GUARDS-2 F1). Without the space, the forbidden-token row kills each.`

  In the next sub-bullet, change "All five need deliberate evasion" to "All seven need deliberate evasion". At its end, after
  "(`residuals-head.json`).", add: " V7 and V9 are observed surviving at `ecea355b` in that review's records."

  The alternative is to adopt N4's hardening, which kills R2, Y5b, Y5c, V7 and V9. The residual list then shrinks to R1 and Y3.
  That changes what the guard refuses beyond the bead's list, so it is the coordinator's scope call (§2).

### F2 — blocking (code, low). The N1 fixture row survives three one-line weakenings of what its title claims

- **Severity:** low today, because the scan is defence in depth. It is blocking under the verdict rule's "a new row that survives
  the weakening it pins without deliberate evasion": none of the three edits is evasion.
- **Evidence** (all observed in both dist states):
  - The row's title is "lists a module at any depth and with any extension, and skips only the tests and the testkit"
    (`support-purity.test.ts:57`). Its fixture is
    `['a.ts', 'io/b.ts', 'c.mts', 'd.cjs', 'e.test.ts', 'purity.testkit.ts', 'f.json']` (`:60`).
  - What it kills: W1 (no recursion), W2 (`.ts` only), W3 (no `c`/`m`) and W4 (no `j`), each by this row alone. So round 1's
    named weakenings are pinned.
  - What survives:
    - **W5** drops the `x` forms (`/\.[cm]?[jt]s$/u`): the fixture names no `.tsx` or `.jsx`.
    - **W6** broadens the test exclusion to `!name.includes('test')`.
    - **W7** broadens the testkit exclusion to `!name.endsWith('purity.testkit.ts')`.

    Each passes 33 of 33.
  - **Reach:**
    - **W6b** is W6 plus `src/latest.ts`, holding `export * from 'node:crypto';`, and `export * from './latest.js';` in
      `index.ts`. It passes every row, `tsc` exits 0, and the built leaf's `randomUUID` is a function whose two calls differ
      [Observed, `w6-probe.json`]. `./latest.js` satisfies `ALLOWED_SPECIFIER`, and `latest.ts` is an ordinary name.
    - **W5's reach is closed today by the build's exit code.** W5 plus a re-exported `value.tsx` (W5V12) passes the tests.
      `tsc -p packages/support` exits 2 with
      `error TS6142: Module './value.js' was resolved to '…/value.tsx', but '--jsx' is not set.`. It still emits `value.js`,
      and the emitted leaf exports 68 names, `randomUUID` a function among them [Observed, `build-probe.json`]. `node-ci` runs
      `npm run build` (`:88`), so the exit fails CI. W5 therefore needs a second edit, `jsx` in the tsconfig, which no row pins
      [Inferred from the workflow; not run hosted].
    - W7 matters only for a nested `purity.testkit.ts`. A dotted name is refused as a sibling specifier, so it is unreachable
      [Inferred from `ALLOWED_SPECIFIER`].
- **Failure scenario:** someone tidies the two exclusions into one `includes('test')`. Later a `latest.ts` or `attestation.ts`
  helper is added, and it is never scanned. The fixture row, whose title promises "skips only the tests and the testkit", stays
  green.
- **Proposed fix (verified, `fix-check-r2.json` set B).** In `packages/support/src/support-purity.test.ts`, replace line 60 with
  the content of `rev-545-r2/tools/fix-r2-sources-list.ts.txt`:

  ```ts
        for (const file of ['a.ts', 'io/b.ts', 'c.mts', 'd.cjs', 'e.test.ts', 'purity.testkit.ts', 'f.json', 'g.tsx', 'h.jsx', 'latest.ts', 'io/purity.testkit.ts']) {
  ```

  Replace line 64 with the content of `rev-545-r2/tools/fix-r2-sources-expect.ts.txt`:

  ```ts
        expect(sourcesUnder(pathToFileURL(`${dir}/`))).toEqual(['a.ts', 'c.mts', 'd.cjs', 'g.tsx', 'h.jsx', 'io/b.ts', 'io/purity.testkit.ts', 'latest.ts']);
  ```

  - **Verified:**
    - FB0, unmutated, passes 33 of 33.
    - FB-W1, FB-W2, FB-W5, FB-W6 and FB-W7 are each killed by the N1 row alone.
    - W6b-fixB is killed by the N1 row alone.
    - `tsc -p packages/support` exits 0.
  - **The cost for the lane:** the test count does not change. `summary.py` pins the N1 row's title, which is unchanged. The
    head records would need re-running only if the coordinator wants W5, W6 and W7 as committed rule-6 rows. I recommend it:
    one row each, expected killed by `N1_ROW`.

### N1 — note. The createHash row's title overclaims "re-exports nothing from it": a local re-export of the hash passes (V8)

- **Severity:** low (bar 7). The row reads module declarations, and `export { createHash };` without a specifier is not one.
- **Evidence:** V8 passes 33 of 33 and builds. The leaf then exports `createHash`, and `createHash('sha256').update('a')` gives
  `ca978112…`, the SHA-256 of `a` [Observed, `build-probe.json`]. `createHash` is the hash itself, so no clock, randomness, I/O,
  environment or network is reached [Inferred from the API].
- **Proposed fix:** a residual line rather than a retitle, since `summary.py`'s `F1_ROW` pins the title:

  > `- **The createHash row reads module declarations only.** A local `export { createHash };` in `sha256.ts`, re-exported by `index.ts`, passes every row and builds: the leaf then exports the hash constructor itself (review R-GP-IMPL-SUPPORT-LEAF-GUARDS-2 N1, mutant V8). It reaches nothing but hashing.`

### N2 — note. The two new readers have no reader rows, so a one-line narrowing of either silently reopens round 1's F1 or N3

- **Severity:** low (workflow step 2, `SKILL.md:103-104`). The file pins its other two readers this way, and says why
  (`support-purity.test.ts:123`: "A guard whose reader misses a form passes over the form it was written for.").
- **Evidence:**
  - **Q1** narrows `moduleDeclarationsOf` to imports only, and passes the whole file. **Q1Y7**, the same with Y7 added, passes
    33 of 33.
  - **Q2** drops the write visitor's element-access arm, and passes with U3 added [Observed].
  - The F1 row's one-line expectation pins only that the reader reads the hash import.
- **Proposed fix (verified, `fix-check-r2.json` set N):**
  - Extract the write visitor into `propertyWritesOf` (`tools/fix-r2-writes-reader.ts.txt`), and make the no-write row call it
    (`tools/fix-r2-writes-row.ts.txt`).
  - Add `tools/fix-r2-reader-rows.ts.txt`: two describes, with 5 rows for the module-declaration reader and 4 for the write
    reader.
  - With them, FN-Q1 is killed by two module-reader rows and nothing else, and FN-Q2 is killed by one write-reader row and
    nothing else. FN0 passes 43 of 43, and `tsc` exits 0. That is +10 tests with N3 and N4 included.

### N3 — note. The no-write row does not read destructuring targets (U4, U5)

- **Severity:** low. Both need an unusual form, so I count them as deliberate.
- **Evidence:** `[Object.freeze] = [(value) => value];` and `({ value: Object.freeze } = { value: (bytes) => bytes });` pass
  33 of 33 in both states. Each uses only allowed names [Observed].
  - Other forms are not read either: a for-in or for-of target, `++`, `--` and `delete` [Inferred from the visitor, which reads
    only a `BinaryExpression` whose left side is an access].
  - `delete` and `++` make `deepFreeze` throw rather than silently stop [Inferred].
- **Proposed fix:** either disclose U4 and U5 as residuals, or take `propertyWritesOf` from N2. It walks array and object
  patterns, spreads, defaults and parentheses. FN-U4 and FN-U5 are each killed by the no-write row alone, and its reader row
  `[Object.freeze] = [(value) => value];` pins the walk [Observed].

### N4 — note (optional, the coordinator's scope call). An AST reading closes R2's whole class

- **Evidence (verified, `fix-check-r2.json` set N):**
  - `moduleDeclarationsOf` reading `import x = require('m')` (`tools/fix-r2-module-reader.ts.txt`) makes FN-V7 fail the
    createHash row alone.
  - An AST row for `import()` calls (`tools/fix-r2-import-call-row.ts.txt`, "calls no import() in any source, however it is
    spaced or commented") makes FN-V9, FN-Y5b and FN-Y5c each fail that row alone.
  - Y7 and Y6 still fail their own rows, and `tsc` exits 0.
  - R2 itself would fail the same row [Inferred: `void import (value)` is a `CallExpression` on `ImportKeyword`; not run].
- **Why optional:** the PR body says this PR does not refuse R2's class. Adopting this changes what a test guard refuses, and
  that must be ruled on (§2). If adopted, F1's replacement text becomes a shorter residual list: R1 and Y3.

### N5 — note. The body's battery line is a promise, not a result

- **Evidence:** body line 89: "Battery at `ecea355b`: running in a clone; the result follows." [Observed]. Round 1's version
  gave a result ("commands=114, nonzero=0"). The PR has 0 comments [Observed, `gh pr view --json comments`].
- Whether that battery completed, and how, is [Unknown] to me. Hosted `checks` and `node` passed at `ecea355b`, and my own
  governance and quotations runs are clean (§3).
- **Proposed fix:** before merge, replace the line with the run's result, for example "Battery at `ecea355b`: commands=<n>,
  nonzero=0 (`battery_clone.py`, run in a clone)". Rule 7 makes the report valid only for that commit.

### N6 — information. Two survivors are refused by the build, and one suite test timed out under load

- **V6**, `export *` inside a `declare module` block, passes the rows, because the module-declaration reader reads top-level
  statements only. `tsc` refuses it, though: `error TS2666: Exports and export assignments are not permitted in module
  augmentations.` And the emitted `index.js` exports only the three helpers [Observed]. No action.
- **W5's `.tsx` reach** is refused by `TS6142` (F2) [Observed].
- **The full-suite failure:** `start-gates.test.ts`'s "init: a run that passes every start gate pins the consented HEAD, …" took
  5,521 ms against the 5 s default, at load1 about 36 to 41. It is the same test as round 1's N7, the PR does not touch the file,
  and the file passes alone, 104 of 104 [Observed]. The coordinator has routed it to `syzygy-bpyt.4.40`. No action here.

## 5. Every changed output, or the evidence that there is none

- **Product code:** none changed. The code diff is `support-purity.test.ts` (+57/−2) and `no-egress.test.ts` (+13/−2)
  [Observed].
- **Built output:** 502 of 502 non-test `dist/` files are identical between builds of `5995aa3c` and `ecea355b`, with none on
  only one side (`dist-compare.txt`) [Observed].
- **The S10 bundle:** 935,757 bytes and sha256 `18172eb2…3340`, at `ecea355b` with dist built and at the merge `115933f2` with
  dist absent. That equals the lane's record at `62499514` and `f7ea8584`, and round 1's five builds [Observed].
- **Test results in the two changed files:**
  - At `5995aa3c`: support-purity 29, and no-egress 5 passed with 1 skipped.
  - At `ecea355b`: 33, and 6 passed with 1 skipped. So round 2 adds +5.
  - The body's "Tests: +24 ~3 -0" (over three files since `f7ea8584`) is consistent: 19 tests at main and 43 at head; titles 18
    and 42 (`titles.json`).
  - The full suite has 5,528 tests, against round 1's 5,523 [Observed].
- **Governance:** `check_governance` gives 32 OK, 21 WARN, 0 FAIL, the figures the body gives. `check_quotations` gives 0
  findings [Observed].
- **No refusal string, exit code, wire format or rendered byte of any product changes** [Observed, by the comparisons above].

**The body's other changed sentences, checked:**
- **True** [Observed]:
  - F2's and N5's replacement texts, and the Y3 and Y5b/Y5c residual lines: each is present verbatim (whitespace-normalised
    substring of round 1's raw, by script).
  - The "Round 1 repairs" claims. Each fix is byte for byte at the fix-check anchors, and each named mutant is killed by its row
    alone in both states (`summary.py`'s pinned failing sets, re-run in my sample).
  - "selftest catches 19 of 19".
  - The four subject digests, `summary.json`'s digest, and "49 of 49 … 35 of 35".
  - The figures:
    - `suite_run`: 253 files, 5,528 tests, 5,523 passed, 5 skipped;
    - the alone figures;
    - the durations: bundle test 493–893 ms and guard row 357–790 ms at load1 up to 34.56, and `beforeAll` 607–1,228 ms;
    - the merge "112 of 113, with 1 skipped", reproduced on my own merge.
  - "The S10 bundle at `62499514` is byte-identical to main's".
  - "0 of 12 workspaces are unscoped".
  - syzygy-bpyt.46 exists, and it is OPEN.
  - "which the round-2 review assigns to review, not to a test" (line 102). The review is `R-GP-IMPL-SUPPORT-LEAF-2` (syzygy-bpyt.6.3,
    not this PR's round 2): `docs/reviews/R-GP-IMPL-SUPPORT-LEAF-2-RAW.md:482` says "RP6 and E9 need deliberate evasion, which
    is review's job, not a test's.". The body extends that to R1's and R2's classes, as `docs/evidence/syzygy-bpyt-6-14/tools/residuals.py:9`
    does. True, though a reader may take "round-2" for this PR's round 2.
- **Not true or not complete:**
  - **False:** the unchanged R2 clause (F1).
  - **Incomplete:** the battery line (N5).
  - **Out of reach to me:** the claim about lane load1 "28.6–29.8". It is not in a committed record I can check [Unknown].

## 6. Verdict on each round-1 finding taken

| Round-1 finding | Verdict | Basis |
|---|---|---|
| F1 | **met**, with my F1 as a disclosure gap beside it | Y7, Y9, Y10, Y11, Y12 and Y14 are each killed by the createHash row alone, in both states. Y1 and Y8 are still killed. My V1–V5 and V10–V12 are killed by it alone. The expected list is exactly `["sha256.ts: import { createHash } from 'node:crypto';"]` today: FB0, C0 and V0 pass with it. The Y3, Y5b and Y5c residual lines are verbatim and true: each survives in both states. V7 and V9 are R2's class, not round 1's forms, and they pass undisclosed (F1) |
| F2 | **met** | The replacement sentence is present verbatim |
| N1 | **partly met** | `sourcesUnder` is in place, and T1 and W1–W4 are killed by its row alone. W5, W6 and W7 survive (F2) |
| N2 | **met** | K4, K5 and K6 are each killed by the literal row alone |
| N3 | **met** for the forms named | Y6, U1, U2 and U3 are each killed by the no-write row alone. Destructuring targets are not read (N3) |
| N4 | **met** | G0, G1 and M5 are killed by the N4 row alone; G2 by it and the self-test. Every kill is an assertion message. The row took 420 ms in my dist-absent run |
| N5 | **met** | The residual line is verbatim. `syzygy-bpyt.46` carries the widening. Z7's survival rests on the lane's `residuals-head.json`; I did not re-run Z7 |

## 7. Test quality

- **Bar 4** (`SKILL.md:64-67`): met. The one-line declaration list, the literal `FORBIDDEN` strings, the fixture's expected list
  and the thrown message are all literals. Nothing is imported from the module under test as an expected value.
- **Bar 7** (`:82-84`):
  - **Failure output:** met. Each failure names the file and the offending text, for example
    `expected [ 'sha256.ts: Object.values += \'\'' ] to deeply equal []`, the fixture's two lists, and
    `promise resolved "undefined" instead of rejecting`.
  - **Titles:** two overclaim, the N1 row's (F2) and the createHash row's (N1).
  - **A deliberate brittleness, acceptable:** the createHash row pins the declaration "as written", so a quote-style or
    formatting edit of `sha256.ts`'s import fails it. The edit is then visible in review.
- **Bar 10** (`:93-96`): round 2's net delta is +5 tests, and each catches a plausible bug no older row did:
  - the createHash row: Y7 and the rest of round 1's F1 set;
  - the N1 row: T1 and W1;
  - the literal row: K4, K5 and K6;
  - the no-write row: Y6 and U1–U3;
  - the N4 row: G0 and G1.

  The PR's delta is +24. The growth is justified.
- **Workflow step 2** (`:103-104`): five one-line bugs survive the committed rows:
  - W5, W6 and W7 (F2, with a verified fix);
  - Q1 and Q2 (N2, with a verified fix).
- **Determinism:**
  - The fixture row writes into a fresh `mkdtempSync` directory and removes it in `finally`.
  - No new sleep, retry or explicit timeout.
  - The N4 row ran in hundreds of milliseconds.
  - Under load1 of 21–54, the two files never failed unmutated in my runs [Observed].
- **Evidence records:**
  - The lane's rows store each edit verbatim, with the commit, `git status` after, and the record digests. `summary.py` pins each
    round-1 mutant's failing set to the one row its fix added, and `--selftest` catches 19 of 19.
  - That meets AGENTS.md rule 11 and the rule-6 evidence guardrail.
  - The body's "0 of 12" has no committed derivation. It is true (§3), but a record would make it re-checkable.

## 8. Cleanup, and every file kept

- **Deleted** [Observed]:
  - both clones, `rev-545-r2/head` and `rev-545-r2/merge`;
  - every TMPDIR, `/tmp/r545b-1` to `/tmp/r545b-8` (`ls -d /tmp/r545b-*`: "No such file or directory");
  - the 2 MB full-suite JSON (its totals are in `suite-head-summary.txt`);
  - the governance, quotations and typecheck logs;
  - every copy of the PR body, including the two edit-history versions.
- **Not done:** no `npm ci` log was kept. Nothing under `rev-545/` was modified. No worktree under `.worktrees/` was touched. No
  process outside my own tree was killed.
- **Tool changes after a run:** `tools/r2_mutants.py` gained its `extra` mode after the dist-absent `all` run, and its `MINE`
  rows and lane path did not change. The dist-built `all` run used the final tool and reproduced every observation.
- **Kept:** 47 files besides this raw. None is over 300 KB (`find -size +300k`: 0).

| File | sha256 |
|---|---|
| `alone-start-gates.json` | `bdedb5465f76748104b31c3d521bf939c1d8a2903e55d3c7fe75f9c21da96070` |
| `alone-start-gates.log` | `4984f395366b87855145eb3d0874029a9711fd030f23849e86fedd773d2ba1dc` |
| `build-probe.json` | `cf3f0effce854640b34b50cc71a153e997e56b3681cf73349029d0df85860e3b` |
| `bundle-differential-r2.json` | `2b53d676a1fc8552c3817e4b8121a511d0b5f666c7df66f79e002f1722b752ef` |
| `bundle-inputs-merge.json` | `549927b7b725ab4f004625b36e328c5c28532d0ff029695eb77a7bae2d88f2b6` |
| `dist-compare.txt` | `f367737cbaff9cf9d445b14f38fa0f5039474d41f1e0c7a79238067529036c6a` |
| `fidelity.json` | `3c5596748e5d85027e12f9af38fe775eb9f1b289c052b1ce92ae02642b692ea5` |
| `fix-check-r2.json` | `839cd109d9ebd359a5357043958a135cd4e4edf35bacf4ec1d05aad906e0f4a2` |
| `fix-check-r2.log` | `f44b223be22339c2103e460e0ceff7f404fc80a37f069de3f6a7f88ff1817cd3` |
| `main-changed.txt` | `b3bedf426ab96176297f608f898af87fbbd5ba57f2eabeb9c92f3788a452f92d` |
| `merge-four-absent.json` | `8095c042b4e229fe4870dc1bfd993b18d81689d2b9a38a214b1be96004b9461a` |
| `merge-four-absent.log` | `4bb74e3f746dfe264b214013fbc831989f368f615882c92fd9a001e8690c06f9` |
| `pr-paths.txt` | `fd61ac608de0ffdd1df819aef7b574b63b7a92b9d244dbeef35da72d177368ca` |
| `r1-fragments-rederived.json` | `2ff98a8d5624ffcd7c073a39857ff23b5f7c69f8b189ec8f326bc5db0159c977` |
| `r2-extra-absent.json` | `43a5abcdd92fbc5f2b306ba3ddafb7c3694c85effeeec781c3ca9acd8eff1c51` |
| `r2-extra-absent.log` | `08e1f8ae12f3253bb0757f50ca620b773fac821df92b30e0a196beee1dd1e9f4` |
| `r2-extra-present.json` | `6ed1ae35af02bb2bda9dcda488f756e3d693de67f0120aab4a7da78f13e34803` |
| `r2-extra-present.log` | `08e1f8ae12f3253bb0757f50ca620b773fac821df92b30e0a196beee1dd1e9f4` |
| `r2-mutants-absent.json` | `859fe5db95005e1ab2e0b132e6913aeb647f5a3b04d42387414fe46e50e5aa35` |
| `r2-mutants-absent.log` | `71a8fe77b5c4e6c50b651f8188a1f091bcf50e1d79aec4eae18649bf8b5d4459` |
| `r2-mutants-present.json` | `60c1d7df017031a6de1c0bd22fca902d39beb7f7cfe716b4956e034d9dad9c37` |
| `r2-mutants-present.log` | `71a8fe77b5c4e6c50b651f8188a1f091bcf50e1d79aec4eae18649bf8b5d4459` |
| `reader-probe.json` | `50f67c0a2985f1861a178689c8627c483b855360242938031f742e36bbd6e725` |
| `suite-head-summary.txt` | `345c9535b1411a4b305b4546100035d85bf55e60032b5f5b36c62fce8999f810` |
| `suite-head.log` | `e7ee28c6aba9e8eddbabfa9bed376e860ac72cfb64e256593cacf72c71f0d7ee` |
| `suite-load-start.txt` | `636dd34f47a4d2115f9c903352ec27a33ef2a6a1dbfc9e1527d3935dfa54d819` |
| `tools/build_probe.py` | `e09b3c32a741357b00c163f10b6f21fbd5a6713910b47a573b2de5f25b6edac1` |
| `tools/bundle_inputs.mjs` | `8938df099ecfd9ea6ac65bebc13ebb25f86f5e56d65058c69cefbce947165152` |
| `tools/fidelity.py` | `32dcf42f292acce7c3526597b6e74cbfe2672a3f25a6ddf7adcacc1aca1cd7fd` |
| `tools/fix-r2-import-call-row.ts.txt` | `a3bedd26700a469cfd1ada9b325dc54b65558bbca4501dcfabca09137f578f8f` |
| `tools/fix-r2-module-reader.ts.txt` | `547e3481bde0c5ed05552b274bd4b34e6943fdaf70aca86d7db957763597d1ab` |
| `tools/fix-r2-reader-rows.ts.txt` | `3e95d402f3f8a791ff701610beec0082572c012f8c2cf668a55dce1e21841ff8` |
| `tools/fix-r2-sources-expect.ts.txt` | `dcac436a1b37cda314fa595e1ef251a2cd74fcb0030478ae56b60c8e9cfb77b7` |
| `tools/fix-r2-sources-list.ts.txt` | `8d6917d59071f8cafe92378ecb2436176677d115cf444dd584055449b912ffb3` |
| `tools/fix-r2-writes-reader.ts.txt` | `ca2d30a86db8e34189b2394ca0267b3b10ba5a2302073a11a33e840223c77095` |
| `tools/fix-r2-writes-row.ts.txt` | `af407589ea212a09f0d965c5a6e38212a2d727c33a4058ed1bfe6d67bde820ba` |
| `tools/fix_check_r2.py` | `565d4a35d1e860c3f27ff22b4fd231b51e8e6472b58529eb012a3cb21705cb15` |
| `tools/r2_mutants.py` | `3b954d84e97771016b6dcccf2d3e826a9225e46d02330d9c94b23831fb0a5a4f` |
| `tools/vsum.py` | `50d187e88f450fd0fac74b968f688ac36522c437ecc9a09704ad986d91935b2f` |
| `tools/w6_probe.py` | `29516c1ad89e21f55d3736c2da4ee0ea31be735324862e6d15237531e379cbfa` |
| `two-head-absent.json` | `0eb8631995c4fa388de27da26a436a73e497d4d58b0025ef8ed287997255a4ad` |
| `two-head-absent.log` | `7dac508650ec54d94e48098cdd9b0956d2e64665ea7685f805bad7ed6438d8da` |
| `two-head-present.json` | `1f3ab1f5c1f0a544bbb3c359c18b9249fde8c57a3cf7e1cc3675c53c94a53354` |
| `two-head-present.log` | `a5d6de585a99963a2bab159e197ac2c48fe1c76e538aa2a510e4759e8bfd1d1f` |
| `w6-probe.json` | `0367e471c294aa69ff8412cd7ae668155c7b87d11ea373245204ccbe6fcedae2` |
| `ws-manifests.txt` | `3c14d713b0bf0fcda08fcb133ebee5f8d3f41b709c654759896abdbd60872d66` |
| `ws-names.txt` | `cd20bfc7aa91cb23b550a8dfa338f4240856d303ae9d85a3136eb7a446cafa7e` |

Some files share a digest because their content is identical:
- the two `r2-extra-*.log` files, and the two `r2-mutants-*.log` files, print the same lines (their JSON records differ in dist
  state and timings);
- `dist-compare.txt` matches round 1's file byte for byte, as the same comparison result.
