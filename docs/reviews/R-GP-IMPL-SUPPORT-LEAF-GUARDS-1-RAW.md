# R-GP-IMPL-SUPPORT-LEAF-GUARDS-1 — CC-REV-1 implementation review of syzygy-bpyt.6.14, round 1
Verdict: REVISE
Reviewed commit: 5995aa3c
Subject: r1-review.diff sha256 c1011bc5b078a5979571b4da361037616c10740a586708413d13c23fae2582ec

Reviewer: fresh-context CC-REV-1 reviewer (Claude Opus 5.5), 2026-10-28. I did not author the change. I changed no pull request,
branch or worktree, pushed nothing, commented nowhere and dispatched no workflow. I fetched no target repository content: every run
used this repository's sources and the S10 fixture clone that `makeClone` builds. I opened no credential file and nothing under
`~/.claude/` or `~/.config/`. Paths in this file are relative to the repository unless they name `rev-545/`, which is
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-545/`.

Verdict in one line: the work the bead lists is done and it holds, but F1 is a blocking gap. The allowlist cannot see a module
binding that names no identifier. One plain line, `export * from 'node:crypto';`, passes every guard, builds, and lets the owner-act
drafter call `randomUUID` with both purity tests green. F2 is a false sentence in the PR body. N1 to N7 are notes.

## 1. Subject identity checks

All digests below were computed by script in a scratch clone (rule 3).

| Check | Result |
|---|---|
| `sha256sum r1-review.diff` | `c1011bc5b078a5979571b4da361037616c10740a586708413d13c23fae2582ec`: **matches** the brief [Observed] |
| `git diff f7ea8584 5995aa3c \| sha256sum` | `c1011bc5…82ec`, and `cmp` against the subject file says identical; `--shortstat`: `28 files changed, 7876 insertions(+), 48 deletions(-)` [Observed] |
| `git diff f7ea8584 3b04b1cd -- packages \| sha256sum` | `752b9a9829403ca0604b75de8af315b33d57de3eacdce4e00a091a3a5d9649c5`: **matches**; `4 files changed, 190 insertions(+), 48 deletions(-)` [Observed] |
| `git diff 3b04b1cd 5995aa3c --stat -- packages` | empty: the evidence head changes no package path [Observed] |
| PR head (`gh pr view 545 --json headRefOid`) | `5995aa3c0a23f4862f7107c401a72a222b8a7998`, OPEN, MERGEABLE [Observed] |
| Merge base of `5995aa3c` and GitHub `main` (`81862261`) | `f7ea858480b30ffc4407154a84d1d03f3fe4a549` [Observed] |
| Branch commits `f7ea8584..5995aa3c` | `681f82db`, `dff82655`, `c7753a53`, `0dc7dd6b` (merges `f7ea8584`), `3b04b1cd`, `5995aa3c` [Observed] |

**Main has moved.** `main` is `81862261` (#541 `a403b902`, then #543 `81862261`). It was still `81862261` at 2026-10-28T01:40+08:00.
`git diff --name-only f7ea8584 81862261` lists 196 paths [Observed]. Of those:
- **PR paths:** 0 of the PR's 28 paths [Observed, `comm` of the two lists].
- **Manifests:** 0 `package.json`, `package-lock.json`, `tsconfig*` or `vitest*` files [Observed].
- **Implementation paths:** 5. They are `apps/three-surface-poc/src/polaris-generation/generation-mutation{,-run-main}.ts`,
  `generation-mutation.test.ts`, and `packages/polaris-generation-core/src/workspace-reach{.test,.testkit}.ts`.
- **What the S10 bundle reads:** the bundle's region comments name 89 workspace modules, and 0 of them changed on main [Observed,
  `bundle-diff-1.json`].
- **What the alias derivation reads:** the 13 manifests (0 changed), the 18 entry files (0 changed), and
  `workspace-reach.testkit.ts`. #541 changed that testkit by `+13/−4`. All 17 changed lines are ` * …` doc-comment lines
  [Observed, by script over `git diff -U0`]. `targetOf`, `moduleIn` and `resolveIn` are unchanged.

A local merge of `5995aa3c` with `81862261` (`6b04ed32`) is clean. It builds the same S10 bundle bytes (§3).

**A correction to the brief, not to the PR.** The brief says the allowlist "holds 20 names before the merge with main, and 7 more
for `decode-utf8.ts`". By script, the list holds 13 names at `681f82db`, `dff82655` and `c7753a53`, and 20 at `0dc7dd6b` and
`3b04b1cd` [Observed]. So it is 13 plus 7, which is 20. The PR body's "a literal list of 20 names" is right.

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:16-58`):
- "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent performing the
  change never finally decides which classes it touches."
- Class 1: "**authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- Class 3: "**deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
- Class 4: "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- "A reviewer or the owner may reclassify at any time." "Self-declared complexity never exempts these classes (CC-BAR-6)."
- "Per the canonical bar, if the reviewer authors semantic fixes, the exact resulting head gets fresh independent review."

**GP-Q0** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:44-97`):
- "'Behavior-preserving' means none of the following changes: a rendered byte, a wire format, a refusal string or an exit code;
  a signed or digest-bound artifact; a consent, security or retention decision."
- Review rule: "Each pull request states which CC-REV-1 classes it touches."
- Which pull requests get the further checks: "pull requests touching class 1 (authority boundaries), class 3 (deterministic
  observation) or class 4 (security)".
- The checks themselves: "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;
  a rule-6 mutant for each predicate; a non-blocking owner notice in the cycle report."
- The stop clause, lines 96-97: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**AGENTS.md at `5995aa3c`:**
- Rule 6 (`:126-127`): "Mutate the input and confirm the check fails, per predicate, before trusting it".
- Rule 9 (`:132`): "A claim of absence needs a sweep with a denominator."
- The `@syzygy/support` note (`:184-187`): it is "a leaf with no workspace dependency, imported by the PWB core, the Polaris
  generation packages, the dossier and the POC app."

**Test-rigor bar** (`git show 5995aa3c:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
- `:42`: "**A test is worth keeping only if some plausible bug makes it fail.**"
- `:64-67`, bar 4: "Expected values are literals or independently derived."
- `:82-84`, bar 7: "Test names state expected behavior … A maintainer should localize the bug from failure output alone."
- `:93-96`, bar 10: "A test is worth *adding* only if it catches a plausible bug no existing test catches … Reviews state the net test delta".
- `:103-104`, workflow step 2: "apply the mutation thought-experiment: name a one-line bug in the code under test this test would
  *not* catch but should."

**Class ruling.**
- **Class 4 is confirmed.** The S10 proof is the verification of an egress path. The support guard refuses file, network,
  environment and process reads in a leaf that egress-relevant code inherits.
- **Class 3 is added (reclassification).** The guard's refusal of clocks, randomness and the environment is what keeps `sha256`,
  `deepFreeze` and `decodeUtf8` deterministic. The PWB core inherits them, and its digests feed observation identity [Inferred
  from the AGENTS.md note]. Adding class 3 has no process consequence: class 4 already draws GP-Q0's three further checks.
- **Not class 1.** No authority-boundary code changes. The four code files are three tests and one testkit [Observed, diff
  paths]. The body-read authority inherits the leaf, but its typed authority, write universe and adapter authorization are not
  in the diff.
- **The three GP-Q0 checks for this pull request:**
  - The old-versus-new differential is the S10 bundle differential: five builds, byte-identical. The base-versus-head mutant
    tables add to it. No record corpus is parsed by this change.
  - A rule-6 mutant per predicate is present, except two that no row pins: the scan's recursion and extension filter (N1), and
    the guard's presence in `bundleDriver` (N4).
  - The owner notice is the coordinator's to write.

**Does anything a gate accepts or refuses change?** No [Observed]:
- No product module is in the diff.
- 502 of 502 non-test `dist/` files are byte-identical between `f7ea8584` and `5995aa3c` builds, with no file on only one side
  (`dist-compare.txt`).
- The S10 bundle is byte-identical in all five builds.

The two test guards refuse more than before. At `f7ea8584`, the lane's RP/E/L/X rows and my Y1, Y2, Y4 and Y13 survive, and at
head they are killed [Observed for mine]. A test guard is not a gate: the bead itself says "Test-only. Nothing a gate accepts or
refuses changes." So the stop clause is not reached. F1's fix is the same kind of change, and I rule it in scope for this bead.

The PR body argues differently for R1 and R2: refusing them "would change what the guard refuses beyond the bead's list". That
argument would also cover Y1, Y2, Y4 and Y13, which none of the bead's mutants name and which the PR's allowlist already refuses.
So it cannot be the boundary. If the coordinator nonetheless reads the stop clause as covering test guards, F1 goes to the owner
as one question. Either way the verdict is REVISE.

## 3. What I ran, and the results

Everything ran in my own clones under `rev-545/`: the reviewed commit, `f7ea8584`, and the local merge `6b04ed32`. Each clone
had `npm ci` (117 packages). Each suite ran with a private TMPDIR (`/tmp/r545-1` to `/tmp/r545-9`), all since deleted. I ran
one vitest process at a time. `load1` is `/proc/loadavg` on a 12-core host.

| Run | load1 | Result (verbatim where quoted) |
|---|---|---|
| Re-derived the shared reader and list (`tools/identity.py`, f7ea8584 vs 3b04b1cd) | n/a | `filterEqual: true`, `regexesEqual: true`, `forbiddenEqual: true`; 1 filter, 3 regexes and the whole 9-token list in each of the testkit, the base support test and the base drafter test. The only textual difference is the base drafter's `match[1]` without `!`, a TypeScript non-null assertion with no runtime effect. Neither head test keeps a copy (0, 0, 0) [Observed] |
| The four files at head, every `dist/` absent: `packages/support` (all 4 files), `owner-act-drafter.test.ts`, `no-egress.test.ts`, `workspace-reach.test.ts` | 39.85 → 44.04 | `total 102 passed 101 failed 0 pending 1 files 7 failedFiles 0 success True`. support-purity 29, drafter 3, no-egress 5 passed and 1 skipped (the no-strace arm), workspace-reach 48 [Observed] |
| `npm run build` from no `dist/` at head (this is the typecheck) | 43.35 | exit 0; 12 `dist/` [Observed] |
| The same four files, all twelve `dist/` built | 37.48 → 37.32 | `total 102 passed 101 failed 0 pending 1 … success True` [Observed] |
| Lane's `tools/mutants.py`, head, dist present | 29–31 (during and after) | `summary {'rows': 40, 'asExpected': 40, 'unexpected': []} status after '' leftovers []` [Observed] |
| Lane's `tools/mutants.py`, head, dist absent | not recorded | `summary {'rows': 40, 'asExpected': 40, 'unexpected': []} status after '' leftovers []`. All 40 observations equal the dist-present run [Observed] |
| My mutants (`tools/rev_mutants.py`), head, dist present: S0, Y1–Y14, N0, Z1–Z6 | 23.5–30.2 | `{'rows': 24, 'asExpected': 24, 'unexpected': []}` [Observed] |
| The same with Z7 (and N0), dist present | 20.5–21.5 | `{'rows': 2, 'asExpected': 2, 'unexpected': []}` [Observed] |
| My mutants, head, dist absent (adds K4 and Z7) | 33.2–42.3 | `{'rows': 26, 'asExpected': 26, 'unexpected': []}` [Observed] |
| My Y rows at `f7ea8584`, dist absent (head expectations, to show what the PR adds) | 30.5–36.2 | Y1, Y2, Y4 and Y13 survive at base (they are head kills). Y5 and Y8 are killed at both. Every head survivor also survives at base [Observed] |
| BM4 at `f7ea8584` (the lane's M4 at main: the hand-written `@syzygy/support` alias dropped) | 38.6 / 34.9 | dist absent: killed, `Could not resolve "@syzygy/support"`; dist present: survives, 2 passed [Observed] |
| Bundle differential (`tools/bundle_diff.py`), five builds | 32–39 | base-absent, base-present, head-absent, head-present and merge-absent all `bytes 935757`, sha256 `18172eb2e96de6bb703c3c7110d61d5896853d2c865c2a609e9703dca79b3340`, 89 workspace inputs, identical input lists, `statusAfter ''` [Observed] |
| The four files on the merge with main `6b04ed32`, dist absent | 34.22 → 32.70 | `total 108 passed 107 failed 0 pending 1 files 7 failedFiles 0 success True`. workspace-reach is 54 (+6 from #541) [Observed] |
| Full suite once at `5995aa3c`, all `dist/` built (`npx vitest run`) | 43.95 at start | `total 5523 passed 5452 failed 1 pending 70 files 253 failedFiles 2 success False` [Observed]. Both failed files are below |
| `act-families.test.ts`, failed in the suite | (suite) | `Hook timed out in 10000ms.` 65 tests were skipped behind the hook [Observed] |
| …the same file alone | 42.35 | `total 65 passed 65 failed 0` [Observed] |
| `start-gates.test.ts`, failed in the suite | (suite) | 1 failed: `init: a run that passes every start gate pins the consented HEAD, …`, `Error: STACK_TRACE_ERROR`, duration 6105 ms against the default 5 s test timeout [Observed] |
| …the same file alone | 44.08 | `total 104 passed 104 failed 0` [Observed] |
| `npm run typecheck` at `5995aa3c` | — | exit 0 [Observed] |
| `python3 scripts/check_governance.py` at `5995aa3c` | — | exit 0; `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted` [Observed] |
| `python3 scripts/check_quotations.py` at `5995aa3c` | — | exit 0; `OK    QC-1  a quotation beside a path:line locator was said by that file — 40 quotations examined in 21 of 979 .md files scanned (…), 0 findings` [Observed] |
| Lane's `tools/summary.py <tree> --check` and `--selftest` | — | `check: summary.json matches its inputs and no check fails`; `selftest: all 13 mutations caught`. `summary.json` sha256 `e1bfb03b…204e`, as in the PR body [Observed] |
| AST probe (`tools/ast_probe.mjs`): the PR's `identifiersOf`, copied verbatim, over 28 forms | n/a | `ast-probe.jsonl`; see §4 F1 and §6 (c) [Observed] |
| Names the product modules use (`tools/used_names.mjs`, at 3b04b1cd) | n/a | `listCount 20 usedCount 20 unusedOnList [] usedNotOnList []` [Observed] |
| Manifest fields beside a pinned `exports` (`tools/fields_probe.mjs`; Node v24.6.0, esbuild 0.28.2) | n/a | `nodeLoads "a"`; esbuild bundles `"a"` on `node`, `neutral` and `browser` (§6 (b)) [Observed] |
| Y7 plus Y14's drafter edit, built and run (`tools/y7_build_probe.py`) | — | `tsc -b packages/support packages/three-surface-poc-core` exit 0; `{"randomBytes":"function","randomUUID":"function","setEngine":"function","nonceLooksRandom":true,"twoNoncesDiffer":true}`; sources restored, rebuilt, `git status` empty [Observed] |
| My proposed fixes (`tools/fix_check.py`, `fix_check2.py`, `fix_check3.py`), dist present | 45.7–50.6 / 27.8–28.2 / 25.3 | `{'rows': 11, 'asExpected': 11, 'unexpected': []}` and `build with fixes 0`; `{'rows': 3, 'asExpected': 3, …}`; `FW0 … pass`, `FW-Y6 … killed`, `build with fix 0` [Observed] |
| Hosted checks, `gh pr checks 545 -R Tzeusy/syzygy`, at 2026-10-28T01:40+08:00 | — | `checks	pass	25m59s` and `node	pass	4m26s`. Both runs are for head `5995aa3c…`; `node-ci` runs `npm test` (its line 112) [Observed] |

The two suite failures are timeouts at load1 of about 44, in files this PR does not touch, and both pass alone. They are not
grounds for REVISE (see N7).

**Every kill I rely on fails on an assertion or a named build error, not a timeout** [Observed]. Each row's JSON records its
failing test and first message line. The file-level kills read as follows:
- **M2:** `Build failed with 1 error: … [plugin: workspace-sources-only] @syzygy/leak resolves outside packages/*/src and apps/*/src: packages/leak/index.js`.
- **M3 and Z1:** `@syzygy/support: its entry is not a ./dist/X.js whose src/X.ts exists`.
- **M4, dist present:** `… [plugin: workspace-sources-only] @syzygy/support resolves outside packages/*/src and apps/*/src: packages/support/dist/index.js`.
- **M4, dist absent:** `[plugin: workspace-sources-only] Could not resolve "@syzygy/support"`.
- **Z3:** `… @syzygy/support resolves outside packages/*/src and apps/*/src: packages/support/lib/index.ts`.
- **Z5:** `[plugin: workspace-sources-only] Cannot read directory "packages/support/src/index.ts": not a directory`.

## 4. Findings

### F1 — blocking. The allowlist cannot see a module binding that names no identifier: `export * from 'node:crypto'` passes every guard, and the owner-act drafter then takes randomness through `@syzygy/support`

- **Severity:** medium, blocking under the brief's verdict rule: an impure support module passes without deliberate evasion. It
  is not a regression, because Y7 survives at `f7ea8584` too [Observed]. The blast radius is every importer of the leaf,
  including the owner-act drafter, whose own guard stops at `@syzygy/support`.
- **Evidence:**
  - [Observed, `ast-probe.jsonl`] The PR's walk (`support-purity.test.ts:28-36`) reports **no identifier** for:
    - `export * from 'node:crypto';`
    - `export * as 'randomBytes' from 'node:crypto';`
    - `export { 'randomBytes' as 'value' } from 'node:crypto';`

    For `export * as value from 'node:crypto';`, `import { 'randomBytes' as value } from 'node:crypto';` and
    `import * as value from 'node:crypto'; export { value };` it reports only `value`, which is on the list.
  - [Observed, `rev-mutants-head-{present,absent}.json`] Each of the following passes `support-purity.test.ts`, 29 of 29, in
    both dist states:
    - Y7: `export * from 'node:crypto';` in `index.ts`;
    - Y9: `export * as value from …`;
    - Y10: the string-named re-export;
    - Y11: RP8 rewritten as `import { createHash, 'randomBytes' as value } from 'node:crypto'; export const T = value(8);`;
    - Y12: a namespace import re-exported.

    Y8, `export * from 'node:fs';`, is killed, so only the allowed module leaks.
  - [Observed, Y14] Y7 plus a drafter edit, `import { sha256, randomUUID } from '@syzygy/support'; export const nonce = (): string => randomUUID();`,
    passes `support-purity.test.ts` and `owner-act-drafter.test.ts` together, 32 of 32.
  - [Observed, `y7-build-probe.json`] The same edits build with `tsc -b` (exit 0). The built leaf exports `randomBytes`,
    `randomUUID` and `setEngine`, and two calls of the built drafter's `nonce()` return different UUIDs.
  - Node's documented `crypto.setEngine` also loads an OpenSSL engine from a shared-library path [Inferred from the Node API;
    not exercised].
- **Why this is not deliberate evasion:**
  - Y7 is one ordinary statement, with no obfuscated string, bracket access or unusual syntax. RP1, `export { readFileSync } from
    'node:fs'`, is the same shape on a forbidden module, and round 2 counts it as an impure leaf.
  - The test's own comment says the opposite of what Y7 shows (`support-purity.test.ts:19-20`): "another export of
    `node:crypto` (`randomBytes`) … is a name not on it." RP8's class, randomness from the allowed `node:crypto`, survives
    through Y7.
  - Y9 and Y12 need an allowlisted binding name, and Y10 and Y11 a string-named specifier. Those are milder evasion, closed by
    the same fix.
- **Failure scenario:**
  - A later edit adds `export * from 'node:crypto';` to `packages/support/src/index.ts`, perhaps "so importers need not import
    the hash module".
  - `@syzygy/support` now exports `randomUUID`, `randomBytes`, `randomInt`, `getRandomValues`, `webcrypto` and `setEngine`.
  - The owner-act drafter (a class-4 gate) or the body-read authority imports `randomUUID` from `@syzygy/support`. The drafter's
    guard admits that specifier, and its token list does not name `randomUUID`.
  - Every committed test stays green, `tsc -b` builds, and the dossier runs it.
- **Proposed fix (verified, `fix-check.json`).** Pin, by AST, every import or re-export that names a module other than a sibling,
  so the one external declaration is exactly the hash import. Add after `identifiersOf` (`support-purity.test.ts:36`):

  ```ts
  /** Every import and re-export declaration of a module, by its specifier and as written. */
  function moduleDeclarationsOf(name: string, source: string): { specifier: string; text: string }[] {
    const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, false);
    return file.statements.flatMap((statement) =>
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier !== undefined && ts.isStringLiteral(statement.moduleSpecifier)
        ? [{ specifier: statement.moduleSpecifier.text, text: statement.getText(file) }]
        : []);
  }
  ```

  Add this test before "names none of the forbidden tokens …" (`:54`):

  ```ts
    it('takes only createHash from node:crypto, by its own name, and re-exports nothing from it', () => {
      // An `export *`, a namespace binding or a string-named specifier names no identifier, so the allowlist cannot see it.
      const external = SOURCES.flatMap((file) => moduleDeclarationsOf(file, read(file))
        .filter(({ specifier }) => !specifier.startsWith('./')).map(({ text }) => `${file}: ${text}`));
      expect(external).toEqual(["sha256.ts: import { createHash } from 'node:crypto';"]);
    });
  ```

  - **Fix verified [Observed, `fix-check.json`]:**
    - The fixed test passes on the reviewed tree (FX0).
    - It kills Y7, Y9, Y10, Y11, Y12 and Y14, each on "takes only createHash from node:crypto, …".
    - It still kills Y1 and Y8.
    - `tsc -b packages/support` exits 0 with it applied.
  - **Also add** a rule-6 row for it: Y7's fragment, killed. Extend the PR body's "Residuals" with the variants this review
    observed:
    - R1 reaches the environment (Y3: `Object['constructor']['constructor']('return globalThis')()['process']['env']['HOME']`).
    - R2's class includes a newline (Y5b, `import\n(bytes)`) and a comment (Y5c, `import/**/(bytes)`) between `import` and `(`.
  - Changing the reviewed test bytes retires this review (rule 10). The new head needs a fresh review (CC-REV-1: "the exact
    resulting head gets fresh independent review").

### F2 — blocking (PR body only). "`TextDecoder` is the one new global" is false

- **Severity:** low. It is blocking only because the verdict rule names "a false sentence in the PR body".
- **Evidence:**
  - The PR body says: "The list now holds them: `STRICT_UTF8`, `TextDecoder`, `bytes`, `decode`, `decodeUtf8`, `fatal`,
    `undefined`. `TextDecoder` is the one new global: a strict decoder of the bytes it is handed."
  - `undefined` is also a global: a value property of the global object, non-writable and non-configurable. The walk sees it
    as an identifier, and the list admits it [Observed: `used-names.json` gives `undefined` from `decode-utf8.ts`].
  - Both are safe in this leaf [Inferred from the APIs]:
    - `undefined` yields one constant and reaches nothing.
    - `TextDecoder` is reached only through `decode`, which reads the bytes it is given. The other names that would open its
      prototype chain (`constructor`, `prototype`) are not on the list.
- **Failure scenario:** a reader takes "the one new global" as the audit of the merge's additions and never asks about the
  second one.
- **Proposed fix (PR body):** replace that sentence with: "`TextDecoder` and `undefined` are the two new globals. `TextDecoder` is
  a strict decoder of the bytes it is handed. `undefined` is the global object's read-only value property. Neither reaches I/O,
  a clock, randomness, the environment or the network."

### N1 — note. No row pins the recursive scan or the extension filter, and the first test's title claims a depth it does not check

- **Severity:** low (bar 7; workflow step 2, `SKILL.md:103-104`).
- **Evidence:**
  - "scans every source module under src, at any depth, not an empty list" asserts only
    `arrayContaining(['decode-utf8.ts', 'deep-freeze.ts', 'index.ts', 'sha256.ts'])` (`:39-41`).
  - The lane's T1 row (recursion dropped, with L1's nested module) survives at head, 29 of 29, in both dist states [Observed,
    my re-run]. With nothing nested, dropping `recursive: true` is a one-line bug no row catches.
  - No row isolates the extension filter `/\.[cm]?[jt]sx?$/u` either. RP11 is killed by the specifier test via
    `./net.mjs`, not by the filter.
  - Impact today is small [Inferred]. A module the scan skips cannot be loaded through the package: `ALLOWED_SPECIFIER`
    admits only `./[a-z0-9-]+.js` siblings, and `exports` is pinned. So the scan is defence in depth. This also answers the
    brief: a product module named `x.test.ts`, or `purity.testkit.ts` at the top level, is skipped. It is still unreachable,
    because a dotted specifier is refused and no entry can name it.
- **Failure scenario:** a refactor drops `recursive: true`, or narrows the filter to `.ts`. Then a later `src/io/*.mts` helper
  goes unscanned, and every row stays green.
- **Proposed fix (verified, `fix-check.json` FX-T1 killed).** Replace `:12-13` with:

  ```ts
  /** Every source module under `dir`, at any depth and with any JavaScript or TypeScript extension, but the tests and the testkit. */
  const sourcesUnder = (dir: URL): string[] => readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((name) => /\.[cm]?[jt]sx?$/u.test(name) && !name.endsWith('.test.ts') && name !== 'purity.testkit.ts').sort();
  const SOURCES = sourcesUnder(SRC);
  ```

  Add `mkdirSync, mkdtempSync, rmSync, writeFileSync` to the `node:fs` import, plus `import { tmpdir } from 'node:os';`,
  `import { dirname, join } from 'node:path';` and `import { pathToFileURL } from 'node:url';`. Then add this row:

  ```ts
    it('lists a module at any depth and with any extension, and skips only the tests and the testkit', () => {
      const dir = mkdtempSync(join(tmpdir(), 'support-sources-'));
      try {
        for (const file of ['a.ts', 'io/b.ts', 'c.mts', 'd.cjs', 'e.test.ts', 'purity.testkit.ts', 'f.json']) {
          mkdirSync(dirname(join(dir, file)), { recursive: true });
          writeFileSync(join(dir, file), '');
        }
        expect(sourcesUnder(pathToFileURL(`${dir}/`))).toEqual(['a.ts', 'c.mts', 'd.cjs', 'io/b.ts']);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  ```

### N2 — note. The shared list's rows pin each token's presence, not its pattern, so a narrowed token silently weakens the drafter's guard

- **Severity:** low (bar 4; bar 8). This is new exposure: the drafter's only defence beyond its import pin now sits in another
  package's testkit (`purity.testkit.ts:18`).
- **Evidence:**
  - Each row asserts `toHaveLength(1)` (`support-purity.test.ts:99`).
  - K4 narrows `/\bDate\b/` to `/\bDate\(/` in the testkit and adds the lane's DK1 (`Date.now()`) to the drafter. It passes
    both files, 32 of 32, because `new Date()` still matches the narrowed token [Observed, both dist states].
  - A token *dropped* is caught (lane K2) [Observed].
- **Failure scenario:** a support-only PR tidies a regex in the testkit, and nobody reviewing it sees that it widens what the
  owner-act drafter may name.
- **Proposed fix (verified, `fix-check.json` FX-K4 killed).** Add to "the forbidden-token list both guards stand on":

  ```ts
    it('is the literal list, so a narrowed token fails here', () => {
      expect(FORBIDDEN.map(String)).toEqual([
        '/\\brequire\\(/', '/\\bimport\\(/', '/\\bfetch\\(/', '/\\bwriteFile/', '/\\bappendFile/', '/\\bmkdir/', '/\\bprocess\\./', '/\\bDate\\b/',
        "/\\b(?:node:)?(?:fs|net|http|https|child_process|os)['\"`]/",
      ]);
    });
  ```

### N3 — note. A write through an allowed global passes: `Object.freeze = (value) => value;` disables every importer's `deepFreeze`

- **Severity:** low. This is an integrity side effect, not I/O, clock, randomness, environment or network, so I do not count it
  under F1. The allowlist sees names, not writes.
- **Evidence:** Y6 adds `Object.freeze = (value) => value;` to `sha256.ts`. Every name it uses is on the list, and it passes
  29 of 29 in both dist states and at base [Observed].
- **Failure scenario:** a module patches `Object.freeze` or `Object.values` at import. `deepFreeze` everywhere in the process
  silently stops freezing, and the frozen-model guarantees that the PWB, Polaris and POC code rely on fail open.
- **Proposed fix (verified, `fix-check3.json`: FW0 passes, FW-Y6 is killed, `tsc -b packages/support` exits 0).** Add:

  ```ts
    it('assigns to no property in any source, so no allowed global is rewritten', () => {
      const writes: string[] = [];
      for (const file of SOURCES) {
        const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, false);
        const visit = (node: ts.Node): void => {
          if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
            && (ts.isPropertyAccessExpression(node.left) || ts.isElementAccessExpression(node.left))) writes.push(`${file}: ${node.getText(source)}`);
          ts.forEachChild(node, visit);
        };
        visit(source);
      }
      expect(writes).toEqual([]);
    });
  ```

  Or disclose Y6 as a residual.

### N4 — note. No row pins that the S10 bundle is built under the guard

- **Severity:** low (workflow step 2).
- **Evidence:**
  - G0 removes `sourcesOnly(SOURCE_ROOT)` from `bundleDriver` (`no-egress.test.ts:72`) and nothing else. The whole file
    passes: 5 passed, 1 skipped [Observed, `fix-check2.json`]. The lane's M5 shows the same with M2 added.
  - The self-test row (`:169-175`) calls `sourcesOnly` directly, and `:160-167` only asserts that the driver bundles.
  - The row at `:160-167` is not redundant: `beforeAll` returns early without strace (`:81`), so it is the only bundle of the
    driver in a no-strace run.
- **Failure scenario:** a refactor of `bundleDriver` drops the plugin. N10's guard is gone, and every row stays green.
- **Proposed fix (verified, `fix-check2.json`: FG0 passes; FG1 is killed with "expected [Function] to throw error including
  '@syzygy/support resolves outside pack…' but got 'Build failed with 41 errors: …'").**
  - Give `bundleDriver` an `aliases` parameter: `async function bundleDriver(outfile: string, aliases: Record<string, string> =
    workspaceAliases()): Promise<void>`, with `alias: aliases`.
  - Add:

  ```ts
    it('bundles the driver only under the guard: an alias that leaves the sources fails it', async () => {
      const out = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'dossier-no-egress-bundle-')));
      try {
        const outside = { ...workspaceAliases(), '@syzygy/support': path.join(SOURCE_ROOT, 'packages/support/package.json') };
        await expect(bundleDriver(path.join(out, 'driver.mjs'), outside))
          .rejects.toThrow('@syzygy/support resolves outside packages/*/src and apps/*/src: packages/support/package.json');
      } finally {
        fs.rmSync(out, { recursive: true, force: true });
      }
    });
  ```

### N5 — note. The guard's `^@syzygy\/` filter misses an unscoped workspace with no entry

- **Severity:** low. The bead names "any @syzygy/* specifier", so this is outside its letter. 0 of 12 workspaces are unscoped
  [Observed, the 12 manifests]. #541 records the same residual for the island guards (`workspace-reach.testkit.ts` at
  `81862261`: "a workspace whose name is not `@syzygy/`-scoped is read by its bare name as outside the workspace").
- **Evidence:** Z7 adds `packages/leak` named `leak`, with no `exports` or `main`, a `node_modules/leak` link, and
  `import 'leak'` in `dossier-site.ts`. It passes `no-egress.test.ts`, 5 passed, in both dist states [Observed]. The bundle
  takes `packages/leak/index.js`, which is outside every `src`, and the guard never runs.
- **Failure scenario:** a new unscoped workspace enters the dossier closure. S10 certifies its non-source file while the guard
  stays silent. The same file is what Node loads, so the proof stays faithful to Node, but not to the "workspace sources only"
  property the guard states.
- **Proposed fix:** add one PR-body residual line, plus a follow-up bead for the owner, consistent with #541's handling: "The
  guard reads only `@syzygy/` specifiers. An unscoped workspace with no entry is bundled from outside `src`, and the guard does
  not see it (review R-GP-IMPL-SUPPORT-LEAF-GUARDS-1 N5, mutant Z7). 0 of 12 workspaces are unscoped." If the owner later rules
  it in, the widening is to run the same check for every bare specifier whose real path lies inside the checkout but outside
  `node_modules/`.

### N6 — information. The derivation accepts a `..` target that Node refuses, and the oracle row catches it

- **Evidence:**
  - Z2 sets `"import"` and `"default"` to `./dist/../src/main.js`. `moduleIn` maps that to `packages/support/src/main.ts`, and
    the alias moves there.
  - Node refuses that target with `ERR_INVALID_PACKAGE_TARGET` [Observed, a two-file probe].
  - The oracle row and S10 both fail on Z2 [Observed]. Z1 (a `node` condition ahead of `import`) and M3 (a target outside
    `./dist`) make the derivation throw [Observed].
- **No action needed.** If one is wanted, `workspaceAliases` could throw on any target containing `/../`. That is better than
  changing `moduleIn`, which the island guards share.

### N7 — information. Two full-suite files failed by timeout under load, and both pass alone

- **Evidence:** in §3:
  - `act-families.test.ts` hit `Hook timed out in 10000ms.`
  - `start-gates.test.ts`'s first `init` test took 6,105 ms against the 5 s default.

  Both ran at load1 of about 44, both pass alone, and the PR touches neither. No line of `.beads/issues.jsonl` names either file
  (0 of 370 lines) [Observed].
- **No action for this PR.** A follow-up under #537's timeout rule is optional.

## 5. Every changed output, or the evidence that there is none

- **Product code:** none changed. The four code files are `support-purity.test.ts`, `purity.testkit.ts` (new),
  `owner-act-drafter.test.ts` and `no-egress.test.ts` [Observed].
- **Built output:**
  - 502 of 502 non-test `dist/` files are byte-identical between builds of `f7ea8584` and `5995aa3c`. The exclusions are paths
    containing `.test.` or `testkit`, `*.map` and `*.tsbuildinfo`. No file is on only one side (`dist-compare.txt`) [Observed].
  - The one new build output is `packages/support/dist/purity.testkit.{js,d.ts}`. `src` is the package's `include`, as it
    already is for its `*.test.js`. The file is test support, and no `exports` entry names it [Observed].
- **The S10 bundle:** byte-identical across f7ea8584 and 5995aa3c, each in both dist states, and the merge `6b04ed32` with
  dist absent. sha256 `18172eb2…3340`, 935,757 bytes, 89 workspace inputs [Observed].
- **Test results in the three changed test files:** 19 at `f7ea8584` and 38 at `5995aa3c`, so +19.
  - Base: support-purity 13, no-egress 2 passed and 1 skipped, drafter 3.
  - Head: 29, 5 passed and 1 skipped, and 3.
  - 3 titles are renamed. This matches the PR body's "Tests: +19 ~3 -0" [Observed].
- **Governance:** `check_governance` 32 OK, 21 WARN, 0 FAIL, the same figures the PR body gives. `check_quotations` gives 0
  findings [Observed].
- **No refusal string, exit code, wire format or rendered byte of any product changes** [Observed, by the dist comparison above].

## 6. Verdict on N9 (a)–(e) and N10, as the bead states them

**(a) "scan src recursively, across .ts, .mts, .cts and .js": done, holds, unpinned (N1).**
- `readdirSync(SRC, { recursive: true, encoding: 'utf8' })` with `/\.[cm]?[jt]sx?$/u`. At head the scan reads 4 product modules
  and skips 5 files (4 `*.test.ts` and `purity.testkit.ts`) [Observed, the `ls`].
- L1 is killed in both states [Observed].
- **Is every module the package can export or load scanned?** Yes for every module reachable through `exports` or a sibling
  specifier [Inferred from `ALLOWED_SPECIFIER` and the pinned `exports`]. A module named to be skipped is unreachable (N1).

**(b) "assert that package.json exports has exactly the "." entry": done, holds.**
- `toEqual({ '.': { types, import, default } })` (`:68-71`). X1 and X2 are killed [Observed].
- **Does it refuse an added `main`, `module`, `browser` or `imports`?** It does not. Beside a pinned `exports` none of them
  changes what Node v24.6.0 loads or what esbuild 0.28.2 bundles on `node`, `neutral` or `browser` (all `"a"`, the `exports`
  target) [Observed, `fields-probe.json`]. `imports` maps only `#` specifiers, which `ALLOWED_SPECIFIER` refuses. So no other
  file is exposed. No note.

**(c) "replace the denylist with an identifier allowlist … That kills RP2-RP16 and E9 in one predicate": done as specified, and
it kills everything the bead lists; F1 is a gap in the predicate itself.**
- RP2–RP16, E4b and E6–E9 are killed by "names no identifier outside its literal list" in both dist states [Observed]. My Y1,
  Y2, Y4 and Y13 are killed too.
- **What the walk sees** [Observed, `ast-probe.jsonl`]: type positions (`Map`, `Env`, `process` in `Map<string, process.Env>`),
  decorators (`dec`, `prop`), JSX in `.tsx` (`div`, `onClick`), `import.meta` (`meta`, `url`), labels, shorthand properties,
  destructuring defaults, computed keys, `#private`, escaped identifiers (read as `process`), `arguments`, `new.target`
  (`target`), and import attributes (`type`).
- **What it does not see:**
  - names in strings and template literals: R1 and Y3, whose bracket keys carry `constructor`, `process` and `env`;
  - module bindings with no identifier: `export *`, and string-named specifiers. This is F1;
  - keywords such as `this` and the `import` of a call. In strict ESM, `this` at module scope is `undefined` [Inferred]. R2,
    Y5b and Y5c pass for the call;
  - writes through allowed names (N3).
- **Every listed name is needed:** 20 of 20 are used and 0 used names are off the list [Observed, `used-names.json`]. None
  reaches I/O, a clock, randomness, the environment or the network through an allowed name alone [Inferred from the APIs of
  `Object` (`freeze`, `isFrozen`, `values`), `Uint8Array`, `createHash().update().digest()` and `TextDecoder().decode()`].
  `TextDecoder` and `undefined` are safe (F2).
- **My mutants, beyond R1 and R2:** every Y and Z row, observed in both dist states unless stated.

  | Id | Mutant | Head | Deliberate evasion needed? |
  |---|---|---|---|
  | Y1 | `Reflect.get(globalThis, 'process').env.HOME` | killed (`HOME`, `Reflect`, `env`, `get`, `globalThis`) | — |
  | Y2 | `const value = eval; export { value };` | killed (`eval`) | — |
  | Y3 | R1 escalated to `…('return globalThis')()['process']['env']['HOME']` | **survives** | yes (string keys; R1's class) |
  | Y4 | `new Function('return 1')` | killed (`Function`) | — |
  | Y5 | `(bytes) => import(bytes)` (no space; allowed names only) | killed (the shared `\bimport\(` token) | — |
  | Y5b | `import\n(bytes)` | **survives** | yes (R2's class) |
  | Y5c | `import/**/(bytes)` | **survives** | yes (R2's class) |
  | Y6 | `Object.freeze = (value) => value;` | **survives** | no; not I/O (N3) |
  | Y7 | `export * from 'node:crypto';` | **survives** | **no (F1)** |
  | Y8 | `export * from 'node:fs';` | killed (specifier and `fs'` token) | — |
  | Y9 | `export * as value from 'node:crypto';` | **survives** | an allowed binding name (F1) |
  | Y10 | `export { 'randomBytes' as 'value' } from 'node:crypto';` | **survives** | a string-named specifier (F1) |
  | Y11 | RP8 as `import { createHash, 'randomBytes' as value } …; export const T = value(8);` | **survives** | a string-named specifier (F1) |
  | Y12 | `import * as value from 'node:crypto'; export { value };` | **survives** | an allowed binding name (F1) |
  | Y13 | `import.meta.dirname` | killed (`dirname`, `meta`) | — |
  | Y14 | Y7 plus the drafter calling `randomUUID` from `@syzygy/support` | **survives both guards** | no (F1) |

  The brief's "a getter on an allowed object" cannot be written with allowed names alone: `defineProperty`, `get`, `prototype`
  and `constructor` are all refused. Y6 is the nearest form that needs no such name: a member of an allowed global replaced at
  import.

**(d) "share one reader and one list with owner-act-drafter.test.ts, so the two cannot drift": done, holds.**
- The byte identity is re-derived (`identity.json`).
- **The drafter's test, line by line** (`owner-act-drafter.test.ts:53-62`):
  - It still reads `./owner-act-drafter.ts`.
  - It computes `[...new Set(specifiersOf(source))].sort()`, the same set as its old inline `new Set([...3 regexes])`, from the
    same filtered text.
  - It keeps the `import type … '@syzygy/cap1-core'` check unchanged.
  - It loops the same nine tokens in the same order.
  - So it is as strong as before for every input [Inferred from the identity, and Observed: DK1 and DK2 are killed, D0 passes,
    and D2 and D5 survive as at base].
- What sharing adds is N2: one edit now moves both guards.

**(e) "retitle the second test to what it proves": done.**
- "names no module but node:crypto and a module beside it in any literal specifier of any source" is exact.
- So are the third test's title and the new "names none of the forbidden tokens it shares with the owner-act drafter in any source".
- The first test's new title overclaims depth (N1).
- The drafter's "is pure: …" title is unchanged and still overclaims, as D2 and D5 show. It is outside the bead.

**Rule 6 for N9: "confirm that each of RP2-RP16, E6-E8 and E9 fails it": confirmed.**
- My re-run of the lane's rows, read by id from the committed round-2 records, kills every one of them at head in both dist
  states [Observed].
- I did not re-run the lane's 35 base rows. BM4 (its M4 at main) matches the lane's record [Observed]. The rest rest on the
  lane's `mutants-base-*.json`.

**N10: "derive the alias map from each workspace package.json exports … add an onResolve guard": done, holds; N4, N5, N6.**
- **Derivation.** `workspaceAliases` (`no-egress.test.ts:28-41`) reads every manifest's `exports` keys, or `main` when there is
  no `exports`. It resolves each through `resolveIn`. `targetOf` accepts only one string, named alike by every non-`types`
  condition, and `moduleIn` requires `./dist/X.js` with an existing `src/X.ts`. All 12 tsconfigs have `rootDir` `src`,
  `outDir` `dist` and `include` `src`, so the mapping matches the build [Observed].
- **Does it resolve as Node would?** Whenever it returns, the string it maps is the one Node and esbuild (platform `node`) take,
  since all their conditions name it [Inferred]. Z1's competing `node` condition and M3 throw [Observed]. The one divergence,
  `..`, is N6.
- **The oracle row** (`:136-158`) pins all 18 entries by literal: cap1-core 2, cap1-daemon 1, http-host 1, polaris-dossier 3,
  consent 3, generation-core 2, support 1, poc-core 1, `@syzygy/app` (by `main`) 1, poc-app 3. Z6, a well-formed 19th package,
  fails only that row: `expected { …(19) } to deeply equal { …(18) }`. M1 and Z2 fail it on a changed value [Observed].
- **The guard** (`:47-63`) compares real paths. It refuses:
  - a symlinked entry: Z3 is refused as `packages/support/lib/index.ts`;
  - an unaliased package's `dist`: M4;
  - a package root's `index.js`: M2.

  An unexported subpath (Z5) fails resolution under the plugin. Each of these is in both dist states [Observed].
- **What escapes:**
  - A relative import that leaves `src` (Z4) is not an `@syzygy/*` specifier. It bundles the same `dist` file Node loads, and
    fails when `dist` is absent [Observed]. That is outside the guard's letter and not a fidelity gap.
  - An unscoped workspace is N5.
  - An `exports` condition the resolver does not read cannot escape: two different targets throw (Z1).
- **The bead's own rule-6 rows:**
  - "the entry-redirect mutant" (M1) fails, on S10's `AF_INET` capture and the oracle.
  - "an unaliased new package" (M2) fails, on the guard.
  - Both hold in both dist states [Observed].
- **The bundle bytes are equal:** five builds, one sha256.

**The attribution rows prove what the body says.**
- T1 survives, so recursion is what kills L1. It also shows recursion is unpinned (N1).
- M4 is killed by the guard naming `packages/support/dist/index.js` with dist present, and by `Could not resolve` with dist
  absent. At main it survives with dist present (BM4).
- M5 survives, so the guard is what kills M2 [all Observed].

**The residuals are stated truly, but incompletely.**
- R1 and R2 are reproduced in their classes (Y3, Y5b, Y5c), and both need deliberate evasion.
- The drafter's denylist stays out of scope, rightly: the bead's (d) asks for one shared reader and list, not a drafter
  allowlist, and D2 and D5 survive as at base [Observed].
- The root `vitest.config.ts` aliases stay hand-written: true, since the file is not in the diff, and N10 names only the S10 map.
- The PR does not disclose Y7, Y9–Y12 (F1), Y6 (N3) or Z7 (N5).

## 7. Test quality

- **Bar 4** (`SKILL.md:64-67`): met.
  - The oracle row and the reader rows use literal expected values.
  - The allowlist and the `exports` pin are literals.
  - Nothing is imported from the module under test as an expected value. The drafter imports its predicate from the testkit,
    and that is a guard, not an expected value.
- **Bar 7** (`:82-84`): met, except N1's first title. Each failure names the file and the offending name or entry, for example
  `expected [ 'sha256.ts: eval' ] to deeply equal []` and `@syzygy/leak resolves outside packages/*/src and apps/*/src:
  packages/leak/index.js`.
- **Bar 10** (`:93-96`): the net delta is +19, and I find growth justified. Each new row catches a plausible bug no older row
  did:
  - the 9 token rows catch a dropped token (K2);
  - the 5 identifier-reader rows include K3's catch;
  - the oracle catches M1, Z2 and Z6;
  - the self-test row checks the plugin;
  - the bundle row is the only driver bundle without strace.

  The suite extends the existing test, as the bead asked.
- **Workflow step 2** (`:103-104`): four one-line bugs survive the committed rows:
  - dropping `recursive: true` (T1, N1);
  - narrowing a shared token (K4, N2);
  - dropping the guard from `bundleDriver` (G0, N4);
  - and the one-line impurity of F1.

  Each now has a verified row proposed above.
- **Determinism:** no new sleep or retry. #537's rule is followed: the bundle test's explicit `120_000` is gone, and the
  `beforeAll` uses the default hook timeout. Under my load of about 44 the four files passed in every run [Observed]. The two
  suite timeouts are elsewhere (N7).
- **Evidence records:**
  - The lane's rows store each mutant's `old` and `new` fragments verbatim, plus the commit, `git status` after, and the
    round-2 records' sha256. That meets the rule-6 evidence guardrail.
  - `summary.py --check` and `--selftest` pass (13 of 13).

## 8. Cleanup, and every file kept

- **Deleted:**
  - my three clones under `rev-545/`: the reviewed commit, `f7ea8584`, and the merge `6b04ed32`;
  - every TMPDIR `/tmp/r545-1` … `/tmp/r545-9` (`ls -d /tmp/r545-*`: none);
  - the governance, quotations, typecheck and build logs;
  - the 2 MB full-suite JSON (its totals are in `suite-head-summary.txt`).
- **Not done:** no `npm ci` log was kept and no copy of the PR body was kept. No worktree under `.worktrees/` was touched, and
  no process outside my own tree was killed.
- **Kept:** 59 files besides this raw, none over 300 KB (`find -size +300k`: 0).

| File | sha256 |
|---|---|
| `alone-act-families.json` | `517ac46e5d2787f46fcea925a26e62fccf1b478be7b8d3cb9a334d0d36d2e56b` |
| `alone-act-families.log` | `bd8a1a6df5a0d6b5667963f3d029746721b879ec5e9bb9060c6c670bd22db70b` |
| `alone-start-gates.json` | `c0c0a82f69ed3298622061fbbc6706855f343fcf10235edfdb8c43dfcdf09155` |
| `alone-start-gates.log` | `2212030c83c6399139ea27cd5a6b39523649c608f706c6587518ce58a29b6b85` |
| `ast-probe.jsonl` | `5b6196196127ffc37014a84ed5cd0353dad6bc443b214993751392c1189612b7` |
| `bundle-diff-1.json` | `4b1aa648169a9f247f72b6343f35678a6617aa480b46f33dd38bc11d06396b89` |
| `bundle-diff-2.json` | `626295e5b0bcd216ea888e7910c09e82416f4e0b269ea251b71f67fe38f2cae6` |
| `bundle-diff-3.json` | `6d32878b07c2357c8ee363d124a4d669ed4867b2639fe5f6e8b7598580af8d24` |
| `dist-compare.txt` | `f367737cbaff9cf9d445b14f38fa0f5039474d41f1e0c7a79238067529036c6a` |
| `fields-probe.json` | `8c4e07ab638d8518af5b092fe9462bc5c786471a79900149ec73d1702c9866ae` |
| `fix-check.json` | `bc30d1ff7d16e05da3b22fff9273018a5b28f53b8a682bad5928b81e77283d1d` |
| `fix-check2.json` | `5e6c29928004d8f9a1719ffffa7622772c70924f69c94090802599f334440e1e` |
| `fix-check3.json` | `4ddc69692077f9e1ab26b067472683c307bae656554223213c4d7b1c30fef82b` |
| `four-head-absent.json` | `305fb986805c7adc91f6210a9971dadba7d42a9c112a53a123cea232c2d6df00` |
| `four-head-absent.log` | `dce0848a4cb9dbc3a1dbbbb0e8102975c9c70e34361363a844c98a6f184a85d3` |
| `four-head-present.json` | `0f73033481e60d640db2933d14c3e68dde87ae9a9ee4bb0a4e6c138754ee1702` |
| `four-head-present.log` | `0ab8b8547ca83796ce01dc760e35c9e94abb936ec1f46b1b583f4938eec44980` |
| `four-merge-absent.json` | `39d9516e3af5cb48ba3e9949f58e415acf4f1367acfb6095079c3e01c9fa4565` |
| `four-merge-absent.log` | `7b218c1195ee0b28257f4db1d25b581222de91c0882ce0f422882b4e22fc8e27` |
| `identity.json` | `f1a8c455bf23a2fb1828c9cd5f8991657a7c44113aed2faf9b3ea1fc273998fa` |
| `lane-mutants-head-absent.json` | `292087497d78060c01512716071f681da401292ba8c10fb1a4e746569038ea1f` |
| `lane-mutants-head-absent.log` | `72c483ce92f6ce4e133aab044a38673d0e6506910b3d113348bbc84c68a92126` |
| `lane-mutants-head-present.json` | `a45913e62283e29f2bf1564be981c1d5dc22ccde74f078db1452fd61cfc2a36b` |
| `lane-mutants-head-present.log` | `72c483ce92f6ce4e133aab044a38673d0e6506910b3d113348bbc84c68a92126` |
| `main-changed.txt` | `f38380b273b5e855c1127103fb4fd805e7ab81641f23bbb534d73d4a9299af91` |
| `pr-paths.txt` | `a7eeeffd223297b8cbf7ac406e489d1831e107e0de9130d9e77ce6daa522cb62` |
| `rev-mutants-base-absent.json` | `b12bb6f02bed3b8343b310bd52af0b54352d470cf480dacdf32faa8da179353f` |
| `rev-mutants-base-absent.log` | `a55cd874aa12764526d9d2d7fb6f6224f8a9586c48d4dd3a568534d6db3294bc` |
| `rev-mutants-base-bm4-absent.json` | `6fb3dbbdfe966c4ed183148d008d35b9aa0c4057e5e8fb33f2ef5ef976424c5c` |
| `rev-mutants-base-bm4-present.json` | `1872b086ff7367c8f022b94add25a28aaafdcb0de6984f99362ae7ed6dfe1e1e` |
| `rev-mutants-head-absent.json` | `b6623dc44fedade48769bae346bd0ce7e5dfc2cf27d6f41f6931ef7ffccee7af` |
| `rev-mutants-head-absent.log` | `043ef293a8f7c149378867a4e207d9f7c56df474a66711399c70118131560b31` |
| `rev-mutants-head-present-z7.json` | `c8270cea6cfc6cb57a9c61ac2eca7d5162066726b11db8859e1d98f46c9950ce` |
| `rev-mutants-head-present-z7.log` | `2b2bbf4f6785946ddbd28d6cfbecbf44616559b6bb2121c3d2e3a68b74b967a0` |
| `rev-mutants-head-present.json` | `04961acfcac6cfae905f979c8d13e7096fef4e0651eb36d5ebf32211df53014d` |
| `rev-mutants-head-present.log` | `4fe4a524a2601ad8833a40e003ee66d187ca3fe601a7a4197e9f7fc3b0b53a5d` |
| `suite-head-summary.txt` | `fd3b47916c8e5d1b2b7c481f7a179082f1bba56493d1d908a71af588c4d9203d` |
| `suite-head.log` | `61a6e21953910b44ec09fe95a4c06b8788b22160c0e65a43a25e8784e7954601` |
| `tools/ast_probe.mjs` | `aea91d04812f026b8eff90cec22279d8ef513387deb5e53454696820fa7d3c73` |
| `tools/bundle_diff.py` | `35df85d3cf195528ef87d2e9e38d4c8c49ddc68563daeeb9f7a2a7e9b5d7690c` |
| `tools/dist_compare.py` | `43d60270e0da8af97b18e665d94edb26604e854ad4cc2fd8001ac0a07ec4eb1c` |
| `tools/fields_probe.mjs` | `22c43e4936e781014cebd94cd4ee59bf0265e2605e3fd83ac9960eb66dd8f86e` |
| `tools/fix-f1-function.ts.txt` | `d61b82da0ca6867b054cc3d47ca691caf055acdf6f68bf655baca04103adff72` |
| `tools/fix-f1-test.ts.txt` | `df6cf47eb9332dbbdac8899a54138251d405282a5d1342249130504b0ce07c46` |
| `tools/fix-n-guard-row.ts.txt` | `4996389751e68e207b43c467ca8d926d6cccd45bf814588360d673e8df4d64fd` |
| `tools/fix-n-literal.ts.txt` | `0193b7c2a2816c983f2b40bf45acfd96b787b5b4e32bdd29d3d0ebd50303bc2a` |
| `tools/fix-n-sources-row.ts.txt` | `1ff7344bcd89bc186ba5074e83c6c3f7b097f4b12d77beed70a5520fd1397e52` |
| `tools/fix-n-sources.ts.txt` | `43261abb96a8c82ef24af4e7a03b3f9db0eca1200dee29b0dd83c6150ee4bde8` |
| `tools/fix-n-writes.ts.txt` | `58e21d40127194a277ed49550266a22367bc1120683b078ce70cbf75076be86e` |
| `tools/fix_check.py` | `54755072d7d7b11d92651ad3306290cc0b179b5713f367a6df15c7e0f00bec97` |
| `tools/fix_check2.py` | `ba1c9e81b81ce6dc947486182ce03c3b88ec97660df69658f35e7b197eac3475` |
| `tools/fix_check3.py` | `1fac54c37d9cf50ce9eab34df0af7c89e3595ec81d03102cdf195311f4bce274` |
| `tools/identity.py` | `27b00dd824b5ddb89cb2a04cd1be610fd1c43a6e165d94f6c0f314261216dcee` |
| `tools/rev_mutants.py` | `817d35e54dc2980cc85c15e7832a46d15343315f2549252ea9ea069be6b3984a` |
| `tools/used_names.mjs` | `2e31437ace8afbcba5eec1f715c9e09a4c0557cee56708e0a01bf8a46fa138af` |
| `tools/vsum.py` | `e21e629bf95ca5b8e0ae31f00d6fdeac10cfffa32f6224c63c3354b008981fdb` |
| `tools/y7_build_probe.py` | `22abb7e980a012babe53820ff94a9ef8e2ba4b05efcfd41abf56033d558ed2ba` |
| `used-names.json` | `b8892062159fd2532b5cc20fb9418c6d81d9e5e445fdc5ac922afc83995ded5b` |
| `y7-build-probe.json` | `f3e45c4b88dfe5aa3a2165d2af5f841a6a213a4f4861a2ec5283c5bf7e41e489` |

The two `lane-mutants-head-*.log` files share one digest because their 40 printed lines are identical. The JSON records differ:
the commit, dist state and timings are recorded there.
