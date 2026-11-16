# R-GP-IMPL-SUPPORT-FOLLOWUPS-2 — CC-REV-1 implementation review of syzygy-bpyt.6.13, round 2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 7d408fd9
Subject: r2-review.diff sha256 dfe5317ed5d34a7ef0e8fcb91f9c367187cefa32152a8ff47c81ef8848f3f674

Reviewer: fresh-context CC-REV-1 reviewer (Claude Opus 5.5), 2026-10-27. I did not write this change and did not edit it. All runs
were in my own scratch clone of `/home/tze/GitHub/syzygy` under `rev-538b/`, with private TMPDIRs `/tmp/r538b-*`, on Node v24.6.0 and
npm 11.5.1. I read no observed-repository body and opened no credential file.

This round is narrow. Its subject is the repair, `4b9a4be0..7d408fd9`. The result: three notes (N1-N3) and no blocking finding.
- The revert is exact. `test-artifact-verification.ts` is byte-equal to its `f7477f52` blob, and it is the only code path in the subject.
- The guard that failed on hosted CI kills the round-1 bytes and passes at the reviewed commit.
- No other PR file sits under an import allowlist.
- Every figure the repair re-derived reproduces at the commit it names. I re-derived the sweep figures by my own predicate.
- The notes are on the record's labels (N1), on the uncomputed control in `item4-repair-sweep.py` (N2), and on PR-body text that
  round 1 ruled on but the repair left in place (N3).

## 1. Subject identity checks

`tools/identity.py` reads git objects only. Its output is `identity-out.txt`: `summary checks=19 ok=19 fail=0`.

| Check | Result |
|---|---|
| `sha256sum lead/b613/r2-review.diff` | [Observed] `dfe5317ed5d34a7ef0e8fcb91f9c367187cefa32152a8ff47c81ef8848f3f674`. Matches the brief. |
| `git diff 4b9a4be0 7d408fd9` | [Observed] Same digest, and byte-equal to the file (356,007 bytes each). `11 files changed, 2169 insertions(+), 17 deletions(-)`. |
| `git diff 4b9a4be0 c7ed9ef2` (the code part) | [Observed] `866b2c1f2fcc8c4ce0e654eaff815543e504d2f9f73691ecd1f08187ece34673`. Matches. `1 file changed, 2 insertions(+), 3 deletions(-)`. |
| `git diff eb8fb6cb 7d408fd9` (the whole PR over main) | [Observed] `4f447dfc7cd6d89f5c255e20d60aae6555d8b197ad86a73ce48aeb3d8ac0f19e`. Matches. `40 files changed, 6484 insertions(+), 6 deletions(-)`. |
| `4b9a4be0` equals git's own merge of its parents | [Observed] The parents are `663061c43f111c162765478c2001ccdba98dd1fa` and `eb8fb6cb523c7d415390ac60c15f7c2c56db2398`. `git merge-tree --write-tree` exits 0 with tree `e2be64d6a7e9258581f1613862d0cea414131dac`, which equals `4b9a4be0^{tree}`. Path for path (`ls-tree -r -z`): `paths=5789/5789 onlyMergeTree=0 onlyCommit=0 differ=0`. |
| The merge moved no PR file | [Observed] `git diff eb8fb6cb 4b9a4be0 -- apps packages scripts` hashes to `7eb6c896dd4f49ce23af62319d2407e5c286b4ad10dd27b2771b1c3bf2c70688`, round 1's own-delta digest. |
| The subject's code paths | [Observed] Only `packages/three-surface-poc-core/src/test-artifact-verification.ts`. No `apps/`, `packages/` or `scripts/` path changes after `c7ed9ef2` (0 paths), and no root-level path is in the subject. `c7ed9ef2` is the last commit touching those trees at `7d408fd9`. |
| The own delta over main at the repair | [Observed] `git diff eb8fb6cb c7ed9ef2 -- apps packages scripts` is `ef0ceb8ccaf443453cd0c43fc789e81cc127f7fe882d65d2cb7c44382f991db6`, 13 paths. That is round 1's 14 less the reverted file, with no path added. Every one of the 13 blobs is unchanged from `b214ef10` to `c7ed9ef2`. |
| Branch heads | [Observed] `git ls-remote` at 18:52 +08:00: `agent/syzygy-bpyt.6.13` = `7d408fd9ae096d10885475f24e9e8ada177c5ef3`, `main` = `41932c3b5aba567376fea3b32a80a54f8b6b30ab`. #540 had not landed. |
| Paths main changed since `eb8fb6cb` that are PR paths | [Observed] Main changed 134 paths (`docs` 126, `packages` 5, `apps` 2, `AGENTS.md` 1). Against the 40 PR paths, the set intersection is 0, and the PR paths whose blob differs between `eb8fb6cb` and main are `0 of 40`. Two methods (`tools/main-overlap.py`, `main-overlap.txt`). Of main's 7 `apps`/`packages` paths, 5 are comment-only production edits (fence-rule pointers, #533) and 2 are tests (`fence-rules.test.ts`, `package-reader.test.ts`). |
| `git merge-tree --write-tree 7d408fd9 41932c3b` | [Observed] Exit 0, tree `a94114995f81044d76750716f1d3f73621143eb2`. My local merge commit `844dd777` (parents `7d408fd9`, `41932c3b`) writes the same tree. |
| Hosted CI at `7d408fd9` | [Observed] `gh pr checks 538`: `checks	pass	27m13s` and `node	pass	4m18s`. The runs are `40482201337` (governance-docs) and `40482201359` (node-ci). Both have `headSha` `7d408fd9ae096d10885475f24e9e8ada177c5ef3`, event `pull_request`, conclusion `success` (`hosted-checks.txt`). |
| Round 1's raw | [Observed] sha256 `33e6a7c96c999341b9c111291322efc1621e9716dc7cdebc4946751283139546`. Matches the brief. |

## 2. Clauses relied on, and the class ruling

### 2.1 Clauses (quoted at `7d408fd9`)

- GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
  - :51 "Behavior-preserving refactors may proceed under the acts already in force. They may touch `apps/**`, `packages/**`, `scripts/**`, tests, CI and root manifests."
  - :52-53 "\"Behavior-preserving\" means none of the following changes:" / "a rendered byte, a wire format, a refusal string or an exit code;"
  - :62 "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security), and class-6 pull requests that remove an endpoint."
  - :64-66 "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;" / "a rule-6 mutant for each predicate;" / "a non-blocking owner notice in the cycle report."
  - :88 "| `6.2` | One non-human-principal rule. Refusal reasons change for inputs that are already refused |"
  - :95-96 "Any change not listed here to what a gate accepts or refuses stops and returns" / "to the owner."
- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
  - :31-32 "1. **authority boundaries** — write-universe, typed-authority table," / "adapter authorization (VIS-5, VIS-6);"
  - :35-36 "3. **deterministic observation** — snapshot composition, evaluation" / "identity, the deterministic/inferred seam (VIS-7);"
  - :37 "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - :40-41 "6. **public interface** — machine-queryable endpoints, adapter contracts," / "anything an external consumer can depend on;"
  - :45 "**Class membership is contested by default and is never finally determined"
  - :51 "- **A reviewer or the owner** may reclassify at any time."
- `AGENTS.md` at `7d408fd9`:
  - :126 rule 6 "Mutate the input and confirm the check fails, per predicate, before"
  - :128 rule 7 "Run the battery in a clone before calling it green; the report is valid"
  - :132 rule 9 "A claim of absence needs a sweep with a denominator."
  - :133 rule 10 "Freeze the bytes a review is bound to; any later edit retires the review."
  - :134 rule 11 "An evidence record names its subject and the subject's digest; a record"
  - :270 "A rule-6 evidence record must store each mutant's `old`/`new` fragment and"
- The test-rigor bar, `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` (read with `git show 7d408fd9:`):
  - :42 "**A test is worth keeping only if some plausible bug makes it fail.**"
  - :64-67 "4. **No tautologies** — A test that mirrors the implementation's logic to compute its expected value, or that asserts a mock returned what the mock was told to return, verifies nothing. Expected values are literals or independently derived."
  - :93 "10. **Growth is governed** — A test is worth *adding* only if it catches a"

### 2.2 Class ruling

I rule **classes 1, 3 and 6** for the PR at `7d408fd9`. **Class 4 is no longer touched.** Round 1 ruled 1, 3, 4 and 6 over `663061c4`;
I reclassify under CC-REV-1 :51 ("may reclassify at any time").

- **Class 4, not touched.** [Observed]
  - Round 1 kept class 4 only because `test-artifact-verification.ts`, a member of the SEC-3 live-verification closure, gained an
    import edge. At `7d408fd9` that file is byte-equal to `f7477f52` and to main.
  - My closure walk (`tools/closure-equal.py`, `closure-equal-out.txt`) gives
    `eb8fb6cb: 54 files; 7d408fd9: 54 files; only eb8fb6cb: []; only 7d408fd9: []; blobs differ: []`, with 9 importers of
    `@syzygy/support` on each side. Against `663061c4` the same walk gives
    `blobs differ: ['packages/three-surface-poc-core/src/test-artifact-verification.ts']` and 10 importers.
  - The no-spawn guard `capture-test-artifact-main.test.ts` has blob `a6be2534561c5edd87204c0d96e5989e50791fa1` at `f7477f52`,
    `eb8fb6cb`, `663061c4`, `7d408fd9` and main.
  - The PR body's "4 security. None edited." agrees. Its sentence naming the guard as the one the first version would have had to
    widen is accurate.
- **Class 1, touched, test-only.** The F3 pin is unchanged from round 1. No production authority file is in the own delta.
- **Class 3, touched.** These are unchanged from round 1: the C1, C2, C3, C11, R3 and R9 digest pins, and the walkthrough-judgment
  fixture's digest (it feeds the evaluator's input bytes).
- **Class 6, touched.** The install preflight's exit code is unchanged from round 1 (`scripts/check_generator_install.mjs` has the
  same blob at `b214ef10` and `c7ed9ef2`).
- **Classes 2, 5 and 7: none.**

**Do GP-Q0's further checks still apply?** Yes. Classes 1 and 3 are still touched (:62).
- The differential (:64) was re-run at the repair. I re-ran it at `7d408fd9` (§3.5).
- Rule-6 mutants (:65) are still carried by round 1's pins (unchanged code). The fixture rows W1-W4 still apply: I re-ran them at
  `7d408fd9` (§3.6).
- The owner notice (:66) is a landing step outside the subject.

**Does anything a gate accepts or refuses change under GP-Q0 (:95-96)?**
- **The repair: no.** [Observed] Its one code change restores a file to its base bytes. The guard's allowlist
  (`ALLOWED_IMPORTS[CORE_SOURCE]`, `['node:crypto', 'node:fs', 'node:path']`) is untouched. No test file and no other guard changes.
- **The PR over main.** The install preflight's refusal of an absent or dangling `node_modules/@syzygy/support` is still the only
  accept or refuse change. Round 1's ruling on it (§2.3 of round 1: not a stop, the move followed through, the `6.2` counter-reading
  named for the owner) is unaffected, because neither the script nor its test moved.
- **The fixture.** Its evaluator verdicts are unchanged: 25 of 25 fixture rows are equal (§3.5), and the fixture's consumer tests
  pass on the head and the merge.

## 3. What I ran, and the results

### 3.1 Builds, the full suite and the static gates at `7d408fd9`

| Run | Result [Observed] | `/proc/loadavg` |
|---|---|---|
| `npm ci` | `added 117 packages in 2s` and all 12 `node_modules/@syzygy/*` links present. The exit code was not captured (zsh `PIPESTATUS`), so it is Unknown by the log alone. The preflight `node scripts/check_generator_install.mjs` then gave `preflight-exit=0` | 24.59 before and after |
| `npm run build` (the hosted `node` command) | `build-exit=0` | 25.70 before, 43.38 after |
| `npm run typecheck` | `typecheck-exit=0` | 43.38 |
| **Full suite**: `npx vitest run --testTimeout=60000 --hookTimeout=60000`, TMPDIR `/tmp/r538b-full`, 18:25:49-18:30:42 | `exit=0`. ` Test Files  245 passed \| 3 skipped (248)` and `      Tests  5393 passed \| 5 skipped (5398)`. 0 `×`/`❯` file rows. The skips: 3 `*.live.test.ts` files (1 each), `no-egress.test.ts` 1, `polaris-opening-index.browser.test.ts` 1 | 45.63 at start, 37.83 at end |
| My log against the lane's `full-suite-c7ed9ef2.log`, file by file (`tools/compare-suite-logs.py`) | `A rows=248 tests=5398; B rows=248 tests=5398`, `paths differing=0`. The summary lines are identical | — |
| `python3 scripts/check_governance.py` | exit 0, `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted` | not recorded (no suite) |
| `python3 scripts/check_quotations.py` | exit 0, `OK    QC-1  a quotation beside a path:line locator was said by that file — 38 quotations examined in 19 of 973 .md files scanned (loc-paren-quote 3, loc-colon-quote 25, quote-paren-loc 10), 0 findings` | not recorded |

The timeouts were raised for the loaded host. Hosted `node` ran `npm test` with the defaults and passed at the same commit (§1).
`capture-test-artifact-main.test.ts` is in the full suite as ` ✓ … (52 tests)`.

### 3.2 The revert, and the guard against the round-1 bytes (rule 6)

- [Observed] The blob of `test-artifact-verification.ts`:
  - at `f7477f52`, `c7ed9ef2`, `7d408fd9` and main: `cc0fd70cb4093ef45002471c6b7da7587dcbf2c9`;
  - at `663061c4` and `4b9a4be0`: `3bbe8aaed9344f5603a11885afb5f6d5cb3fdb81`.
  - The bytes are equal by a second method: `git show` of both, compared, sha256 `095b6f52d59c48741aa4dca053ab86f58d8dc3071f3b9adf70477f9952ac9da8`.
- **The guard's mutant.** In the clone at `7d408fd9`, I wrote the `663061c4` blob of that one file and ran the guard's file alone
  (`guard-mutant-663061c4-blob.txt`, load 26.97). The output:
  - `× capture-test-artifact never starts the observed project (source check) > names no other way to start a process, in the tool or the core module it calls`
  - `AssertionError: test-artifact-verification.ts: expected [ 'imports @syzygy/support' ] to deeply equal []`
  - `Tests  1 failed | 51 passed (52)`
- I restored with `git checkout --` and the tree was clean. The guard's other inputs (`capture-test-artifact-main.ts`,
  `capture-test-artifact.ts` and the test file) have no diff between `663061c4` and `7d408fd9`. So this reproduces the hosted failure
  at `663061c4` for this test's source inputs.
- At `7d408fd9` the same file passes 52 of 52, in the full suite and on the merge.
- `ALLOWED_IMPORTS[CORE_SOURCE]` is line 90 of the test at `663061c4`, as the record says.

### 3.3 The kept half: does any import guard cover a PR file?

**The sweep** (`tools/import-guard-sweep.py`, `import-guard-sweep-7d408fd9.txt`).
- Population: 651 tracked `.ts/.mts/.mjs/.js/.cjs/.py` files under `apps/`, `packages/` and `scripts/` at `7d408fd9`, with no
  `dist/`. 258 of them are test files.
- Signals, by Python `re` (rule 1): `isImportDeclaration`/`moduleSpecifier`, import-syntax regexes inside a regex literal, allowlist
  names, an `imports ` violation label, and `@syzygy/support` as a literal.
- 71 files carry a signal. 56 are production files carrying only the `@syzygy/support` literal. I read the other 15:
  - 10 tests read import edges out of source files (G1-G10 below);
  - 2 tests are not guards (`polaris-dossier/src/inventory.test.ts` reads a run directory, and `no-egress.test.ts` lists bundle
    aliases);
  - 3 scripts are not guards. `build_dossier_agent_provider_v2.py` matched on prose ("Instance filled from"),
    `measure_cli_island_loads.mjs` measures an entry's imports, and `read_ts_exported_string_array.mjs` reads an exported array.
- A second sweep looked at every test or script that lists directories (`readdirSync`, `ls-tree`, `ls-files`, a glob): 72 files
  (`dirscan-tests.txt`). Of the 11 with an import-related term, none is a guard beyond G1-G10.
- A third method: the tracked files that name the three non-test PR code files by basename (`basename-citers.txt`). Each is an
  importer or the file's own test. No guard names them.

**Coverage** (`tools/guard-coverage.py`, `guard-coverage-out.txt`): which PR code files fall under each guard's own declaration, as
read at the commit.

| Guard | What it pins | Files | PR code files covered at `7d408fd9` (of 13) |
|---|---|---|---|
| G1 `capture-test-artifact-main.test.ts` `ALLOWED_IMPORTS` | exact allowlists | 3 | 0 |
| G2 `owner-act-drafter.test.ts` | exact set `['@syzygy/cap1-core', '@syzygy/support']` | 1 | 0 |
| G3 `support-purity.test.ts` | non-test `packages/support/src/*.ts` | 3 | 0 |
| G4 `subpath-imports.test.ts` | `argv.ts`, `state-directory.ts`, `apps/syzygy/src/main.ts` | 3 | 0 |
| G5 `test-artifact-verification-live-source.test.ts` | the SEC-3 closure | 54 | 0 |
| G6 polaris-dossier `cli.test.ts` | no network imports, non-test dossier `src/*.ts` | 43 | 0 |
| G7 polaris-dossier `git-object-reader.test.ts` | one module | 1 | 0 |
| G8 `work-items.test.ts` | `work-items.ts` imports no `node:fs` | 1 | 0 |
| G9 `watch-mode.test.ts` | the 12 `REOBSERVATION_SOURCES` | 12 | 0 |
| G10 `sync-child-process-guard.test.ts` | every test file and its module graph (my approximation of its population); forbids long synchronous `child_process` calls only | 495 | 12 (all but `scripts/check_generator_install.mjs`) |

- [Observed] The guard has a negative control: at `663061c4` the same tool reports
  `G1 packages/three-surface-poc-core/src/test-artifact-verification.ts: specifiers outside the allowlist ['@syzygy/support']`. At
  `7d408fd9` it reports `[]` for all three G1 files.
- [Observed] `test-walkthrough-judgment-fixture.ts` sits under no allowlist. G10 reaches it, but G10's predicate is synchronous
  `child_process` use, which the fixture and `packages/support/src` do not have. G10 passes at the head and on the merge (6 of 6).
- [Observed] `apps/three-surface-poc/package.json` already declares `"@syzygy/support": "0.0.0"`. 21 other files under
  `apps/three-surface-poc/src` import it at `eb8fb6cb` (22 at `7d408fd9`).
- **Answer.** No other PR file is under an import allowlist or a source guard that its change breaks. The denominator is 13 PR code
  files over 10 guards.

### 3.4 The sweep figures, by my own predicate

`tools/own-sweep.py` (`own-sweep-out.txt`) imports neither `sweep.py` nor `population-audit.py`.
- Population: tracked `(apps|packages)/<pkg>/src/**.ts` less the strict test class.
- The name rule drops `test-*.ts` basenames.
- The reach rule adds back each `test-*.ts` file that some name-rule file imports. It resolves every static specifier, with `.js`
  mapped to `.ts` and `<dir>` to `<dir>/index.ts`.
- A site is `createHash(` followed by a quoted `sha256` in any of the three quote characters, outside comments. A definition is any
  `function`, `const`, `let` or `var` binding of `sha256` or `deepFreeze`, or an `as` rename.

| Commit | Name rule: files / sites / sha256 defs / deepFreeze defs | Reach rule: files / sites / sha256 defs | Second method, `git grep -c -F "createHash('sha256')"` over the reach-rule files |
|---|---|---|---|
| `f7477f52` | 241 / 6 / 1 / 1 | 245 / 8 / 2 | 7 files, 8 sites |
| `b214ef10` | 241 / 6 / 1 / 1 | 245 / 6 / 1 | 5 files, 6 sites |
| `4b9a4be0` | 241 / 6 / 1 / 1 | 245 / 6 / 1 | 5 files, 6 sites |
| `c7ed9ef2` | 241 / 6 / 1 / 1 | 245 / **7** / 1 | 6 files, 7 sites |
| `7d408fd9` | 241 / 6 / 1 / 1 | 245 / 7 / 1 | 6 files, 7 sites |
| main `41932c3b` | 241 / 6 / 1 / 1 | 245 / 8 / 2 | 7 files, 8 sites |

- [Observed] The repair's claims hold:
  - name rule "6 sites, 1 local definition, 241 files";
  - reach rule "8 → 7 sites and 2 → 1 local `sha256` definitions";
  - "the merge moved no figure; the revert is the 6 → 7".
- The site left at `c7ed9ef2` is `packages/three-surface-poc-core/src/test-artifact-verification.ts`. The one `sha256` definition
  left is `packages/support/src/sha256.ts`.
- **Rule 6 on my tool** (`own-sweep-mutant.txt`). W4 (an equivalent local copy in the fixture) as a scratch commit on `7d408fd9`
  gives a reach rule of `sites=8 sha256Defs=2`, with the name rule unchanged at `sites=6 sha256Defs=1`. This is the reach rule doing
  what it is for.
- **The lane's `item4-mutants.py` threshold** (`item4-mutants-threshold-check.txt`). Its own `sweep()` on the unmutated trees:
  - `b214ef10 … {'createHashSha256Sites': 6, 'localSha256Definitions': 1, 'killed': False}`;
  - `c7ed9ef2 … {'createHashSha256Sites': 7, 'localSha256Definitions': 1, 'killed': True}`.
  - So the lane is right that this runner would call its own control killed at the repair. Leaving it un-re-run is correct.

### 3.5 The differential, re-run at `7d408fd9`

`differential-rerun.txt`. The lane's `junit-fixture-differential.mjs` ran over my build. The two probed sources are byte-equal at
`7d408fd9` and at my merge, whose build made the `dist`. The core `dist` also carries main's comment-only edits.
- The output is `40 rows`, sha256 `8f58818c4a978473e4a8463f56701248f0d8c3ad8b6d13dc8b852f71074750bb`. That equals the committed
  `junit-fixture-differential-head-c7ed9ef2.json` and `-base-f7477f52.json`.
- `compare-rows.py` base against mine gives `"rowsCompared": 40, "rowsThatDiffer": 0`, exit 0.
- **Rule 6.** I edited the built fixture (`dist/test-walkthrough-judgment-fixture.js:7`) to a latin1 local `sha256`. The result was
  `{'rowsCompared': 40, 'rowsThatDiffer': 25}`, every differing row in family B, exit 1. After restoring, the output hashed to
  `8f58818c…` again.
- [Observed] In `dist`: `test-artifact-verification.js createHash=2 support-import=0` and
  `test-walkthrough-judgment-fixture.js createHash=0 support-import=1`. The PR body's "In `dist`, `createHash` is gone from the
  fixture only" holds.

### 3.6 The fixture mutants W1-W4 at `7d408fd9`, by the test detector

`tools/w-mutants-at-repair.py` (`w-mutants-at-repair.json`) reads the lane's own mutant table, `item4-mutants.py`'s `MUTANTS` and
`FIXTURE_TESTS`. Each `old` occurs exactly once. Each mutant is restored clean.

| Row | Failed / total | Load |
|---|---|---|
| control before | 0 / 86 | 24.66 |
| W1 `run-digest-over-changed-text` | 5 / 86, killed | 25.62 |
| W2 `judgment-digest-drops-the-first-character` | 5 / 86, killed | 25.92 |
| W3 `stale-latin1-local-copy` | 5 / 86, killed | 36.06 |
| W4 `equivalent-local-copy` | 0 / 86, survives the tests (the record's `sweep-only`) | 36.11 |
| control after | 0 / 86 | 37.27 |

[Observed] These equal the record's `testsFailed`/`testsRun` for W1-W4 (5/86, 5/86, 5/86, 0/86), so the rows' "applies" verdict holds
at the reviewed commit. The record itself does not show this for W1 and W2 (N1).

### 3.7 `item4-repair-sweep.py`: does it test what it claims? (rule 6)

`tools/repair-sweep-mutants.py` (`repair-sweep-mutants.json`, `repair-sweep-mutants-out.txt`, load 36.63 at start) works on copies.
- For each case it copies the four tools the lane's script loads into a scratch layout and edits the copies. Each `old` must occur
  exactly once.
- It then runs the copy with `python3 -I` against a fresh throwaway clone. The source clone is never written to.
- Result: `summary 11 of 11 as expected`.

| Case | What changes | Exit | Outcome |
|---|---|---|---|
| R0 unmutated | — | 0 | baseline `7/1`; W3 and W4 `8/2`, killed. Equal to the committed `item4-repair-sweep-c7ed9ef2.json` except the scratch commit ids (`r0-vs-committed.txt`: `True`) |
| T1 threshold from the base | `baseline = counts(clone, 'f7477f52…')` | **1** | baseline `8/2`; neither row killed |
| T2 threshold from `b214ef10` | baseline from `b214ef10` | 0 | baseline `6/1`; both killed. A stale low threshold is not detected |
| T3 kill rule, sites clause only | | 0 | both killed (8 > 7) |
| T4 kill rule, definitions clause only | | 0 | both killed (2 > 1) |
| T5 kill rule `>` → `>=` | | 0 | both killed. **Survives** |
| I1 a no-op row (W3's `new` = `old` plus a comment line) | | **1** | `7/1`, not killed. The detector does not kill a no-op |
| I1 under T5 | | 0 | the no-op is "killed". T5 is visible only with a no-op row |
| I2 run at `f7477f52` | | **1** | `old fragment occurs 0 times` |
| I3 run at main `41932c3b` | | **1** | `old fragment occurs 0 times` (main's fixture still has its own copy) |
| I4 run at a scratch commit that edits one fixture comment | | **1** | `fixtureFileEqualToB214ef10` false |

The answer:
- The tool tests what it claims: W3 and W4, re-applied at the repair against the repair's own counts, are killed by the sweep.
- A wrong (high) threshold (T1), a wrong commit (I2, I3) and a drifted fixture (I4) make it fail.
- T3 and T4 survive by redundancy. Each clause kills both rows alone, which is acceptable.
- T2 and T5 survive because the tool's control row is hard-coded rather than computed. That is N2.

### 3.8 The record, against git objects (rules 6 and 11)

`tools/check-record-r2.py` reads the record and every output at `7d408fd9` from git (`check-record-r2-out.txt`). Result:
`summary checks=113 ok=109 fail=4`.

**What holds** [Observed]:
- `subject.repair`: the reviewed head, the merge commit, its parents and main subject, the repair code commit and that it changes
  only the junit file.
- The junit file's blob at the base, at round 1 and at the repair; the fixture blob; and the own delta at the repair (digest, the 13
  `--name-status` paths, and the `numstat` deletions `{fixture: 5, check_generator_install.mjs: 1}`).
- `figuresHoldAt` names `c7ed9ef2`.
- All 6 `tools` digests, including `item4-repair-sweep.py` `b08c1573…`.
- All 9 `repairFiles`, bytes and sha256. They are the evidence commit's 10 paths less the record itself, which it modifies.
- **The not-applicable rows are still present.**
  - All 9 item-4 rows remain. J1-J5 carry `NO LONGER APPLICABLE at c7ed9ef2`, and each J row's `old` occurs once at `b214ef10` and 0
    times at `c7ed9ef2`.
  - W1-W4 carry `applies`, and each `old` occurs once at both commits.
  - The 15 family-A rows are still in every differential output (`head-c7ed9ef2` splits `{'A-junitDigest': 15,
    'B-walkthrough-judgment-fixture': 25}`), marked at family level by `familyA_junitDigest_status`.
- **Each re-run figure names its commit.**
  - `differential.repair.commit`; `sweep.repair.commit`; the repair-sweep output's `repairCommit` and `control.commit`;
    `fullSuiteAtRepair.commit`; `guardTest.atReviewedHead.commit` and `atRepair.commit`; and `evidenceCurrencyAtRepair.counts`, keyed
    by `eb8fb6cb`, `4b9a4be0` and `c7ed9ef2`.
  - Each figure equals its stored output: the differential's three output digests and its `compareOutput`; the sweep's two rule
    blocks and all four `movesWith` rows; the mutant repair rows and their kill decisions; and the full-suite log's two summary lines.
- **Rule 6 on the checker** (`check-record-r2-mutants.txt`). Three one-field mutations of the record, each a scratch commit:
  - a `repairFiles` sha256 off by one;
  - J1's `status` removed;
  - `baselineAtRepair` 7 → 6.
  - Each adds exactly one FAIL line of its own: `fail=5`, exit 1.

**The four FAIL lines** of the unmutated record:
- J5's status quotes the wrong fragment (N1).
- W1 and W2 claim a re-check that did not happen (N1).
- The committed full-suite log names no commit inside the file. It is bound by `fullSuiteAtRepair.commit` and the `repairFiles`
  sha256, so rule 11 is met by the record. This is not a finding.

**`check_evidence_currency.py --json --rev`**, re-run (`ec-compare-out.txt`):

| Commit | `current` / `drift` / `driftRecordsWithActionableDrift` / `driftRecordsHistoricalOnly` / `unknown` / denominator |
|---|---|
| `eb8fb6cb` | 21 / 209 / 202 / 7 / 148 / 378 |
| `4b9a4be0` | 20 / 210 / 203 / 7 / 148 / 378 |
| `c7ed9ef2` | 20 / 210 / 203 / 7 / 148 / 378 |
| `7d408fd9` | 20 / 210 / 203 / 7 / 148 / 378 |

- The changed rows against `eb8fb6cb` are the same 4 at each later commit: `code-structure-ls-tree-z-mutants-2026-10-21-r2.json`,
  `-r3.json`, `polaris-generator-m6-review-correction-evidence-2026-09-23.json` and `quote-fidelity-mutants-2026-10-04.json`.
- The record's `evidenceCurrencyAtRepair` agrees on every figure. My four JSON outputs (about 304 KB each) were deleted. Their sha256:
  - `eb8fb6cb` `3e5f952b552fb0661eb9dd7a855b683bb1eb7b555b95f7d8affc97e549d97b46`
  - `4b9a4be0` `b01a485f75b4ac760f256bada839e5d67464c88908fdbd0d2cdb48c4ccd4caa1`
  - `c7ed9ef2` `7002072f90da645c8c1fec6cb681a5998cf3006dce8f9c915769f57120c12870`
  - `7d408fd9` `cc0c5a10fd47860b07b8f01e5df9eb6bf3a7c8670ca6e0aa1163a776199d4bbf`

### 3.9 The PR's test files on a local merge with current main

- Merge `844dd777` = `7d408fd9` + `41932c3b`, no conflict. After the merge (`merge-setup.txt`, load 24.05 → 24.24):
  `npm ci` exit 0, `npm run build` exit 0, `npm run typecheck` exit 0.
- `tools/run-files.py` (`run-files-merge.txt`, load 22.56 before, 34.53 after) ran 24 files:
  - the 10 PR test files;
  - the guard, `capture-test-artifact-main.test.ts`;
  - `test-artifact-verification.test.ts`, `-live-source.test.ts` and `-consumers.test.ts`;
  - the 5 fixture consumers;
  - main's two changed tests, `fence-rules.test.ts` and `package-reader.test.ts`;
  - the import guards `sync-child-process-guard.test.ts` and `support-purity.test.ts`;
  - `polaris-authority-sweep.test.ts`, which reads evidence keys.
- Result: `exit=0 files=24 filesRun=24 missing=[]` and `total {'tests': 1103, 'passed': 1103, 'failed': 0, 'skipped': 0}`. This
  includes `capture-test-artifact-main.test.ts: 52 tests, 52 passed`.
- On the merge, `check_governance.py` gives `32 OK, 21 WARN, 0 FAIL (53 checks)` and `check_quotations.py` exits 0.

### 3.10 The battery

- I did not run the PROJECT-STATUS battery. It is outside this brief's minimum, and it takes about 70 minutes on this host.
- The PR body was edited during my review (`updatedAt` `2026-10-27T10:48:53Z`; `pr-body.md` before, `pr-body-2.md` after, which
  differ only at line 65). It now reads: "`commands=114 nonzero=0` … `check_governance.py` 32 OK, 21 WARN, 0 FAIL (53 checks)".
- [Observed] The denominator agrees: the block has 114 commands at `7d408fd9`, `eb8fb6cb` and main, and 110 at `663061c4`
  (`tools/battery-count.py`, `battery-count-out.txt`). A second count of lines starting `python3`/`node`/`npm`/`bash` gives 113 at
  each, one less at every commit.
- Hosted `checks`, whose workflow says its step list "is meant to match the battery `PROJECT-STATUS.md` publishes", passed at
  `7d408fd9`.

## 4. The ruling's requirements, and whether each is met

| Requirement (the coordinator's ruling, and the brief's "what to judge") | Met? |
|---|---|
| Revert the `junitDigest` half of item 4 | **Met.** The blob equals `f7477f52`'s (§3.2) |
| Keep the fixture half | **Met.** The fixture blob `6ea9b5dd…` is the same at `b214ef10` and `c7ed9ef2`. The differential is equal on 25 of 25 fixture rows; W1-W3 are killed and W4 is sweep-only (§3.5-3.7) |
| The allowlist is untouched; nothing widens a guard | **Met.** The guard's blob is the same at 5 commits (§2.2). No test file is in the subject |
| The local `sha256` in `test-artifact-verification.ts` stands as a justified residual | **Met.** The record and the PR body name it as a residual |
| Round 1's `junitDigest` mutants and differential rows are marked not applicable, not deleted | **Met**, with label errors (N1). All 9 rows and all 15 family-A rows remain |
| No production byte other than the revert changes | **Met.** There is 1 code path in the subject (§1) |
| The failing test fails at `663061c4` and passes at the repair | **Met.** Reproduced for this test's inputs (§3.2) |
| The re-derived sweep figures are true at `c7ed9ef2` | **Met**, by my own predicate and a second method (§3.4) |
| The HALF DONE marking, the corrected class and Authority lines | **Met.** `item4.status` begins `HALF DONE at the repair commit c7ed9ef2`. The PR title and the class 3 and 4 lines now say `junitDigest` is not touched. The Authority line names the stop clause as why that half is out. The GP-Q0 sentence still carries round 1's rejected reason (N3) |
| A full-suite and hosted-CI pass | **Met.** Full suite 5393 passed, 5 skipped, 0 failed at `7d408fd9`. Hosted `node` and `checks` pass (§1, §3.1) |
| No other PR file under an import guard it breaks | **Met.** 0 of 13 under G1-G9; G10 passes (§3.3) |
| Scope: nothing beyond the ruling | **Met.** The code change is the revert. The rest is evidence for the revert and edits to the record and the PR text. One new evidence tool is added, `item4-repair-sweep.py`. It is in support of the ruling and changes no product byte. The merge is git's own |
| No change to what a gate accepts or refuses | **Met** (§2.2) |

## 5. New findings

No F finding. Three notes.

### N1 — Four labels in the repaired record say something its own rows do not (severity: low)

- **Evidence.** [Observed] From `check-record-r2-out.txt` and reading the record at `7d408fd9`:
  1. **W1 and W2.** Their `status` reads "applies: the fixture file is byte-equal at b214ef10 and c7ed9ef2; re-checked by the sweep
     detector alone in i4.mutants.repair". But `item4.mutants.repair.rows` holds only `W3-stale-latin1-local-copy` and
     `W4-equivalent-local-copy`. The same block's `scope` says "the probe and test detectors of the other fixture rows (W1, W2) are
     not re-run", and the PR body says "W1-W2 are not re-run". The check's result line:
     `FAIL W1-run-digest-over-changed-text status claim 're-checked by the sweep' agrees with item4.mutants.repair rows: claimed=True inRepairRows=False`,
     and the same line for W2. (`i4.mutants.repair` is also not a key path in the record. It is `item4.mutants.repair`.)
  2. **J5.** Its `status` says "the mutated fragment `sha256(rawJUnit)` is not in the file any more". J5's `old` is
     `import { sha256 } from '@syzygy/support';\n`, not that call. That line is also absent at `c7ed9ef2` (0 occurrences), so the
     verdict is right and only the quoted fragment is wrong.
  3. **`item4.status`.** It says "The fields below describe the state at b214ef10". The `b214ef10`-state fields (`sites`,
     `differential`, `sweep`, `mutants`) come *before* it in the record. The ones after it (`sitesAtRepair`, `repair`) describe the
     repair.
  4. **`evidenceCurrencyAtRepair.note`.** It says the figures were "taken before the evidence of this repair was committed, so it does
     not count the files added by it". My run at `7d408fd9`, after that evidence, gives the same 378 / 20 / 210 / 203 / 7 / 148.
     The reason is that `check_evidence_currency.py` counts only `*.json` files one segment under `docs/evidence/`
     (`list_top_level_json_at_rev`), and every file in `docs/evidence/syzygy-bpyt-6-13/` sits one level deeper. [Inferred] No
     record of this PR is ever in that sweep's population B.
- **Why it is a note, not F.** No count, digest, outcome or commit in these rows is false at the commit it names.
  - W1 and W2's "applies" reproduces: my test-detector run at `7d408fd9` gives 5/86 and 5/86, as recorded (§3.6).
  - The correct statement of what was re-run sits in the same record and in the PR body.
  - What is false is an attribution: which detector re-checked a row, and which fragment was quoted.
- **Failure scenario.** A reader who checks W1 alone, as the rule-6 note (`AGENTS.md:270`) invites, takes it as re-run at the repair
  and looks for its row in `item4.mutants.repair`. It is not there. They score the record as overstating its re-runs, or trust a
  re-check that never happened. A reader of the currency note believes this PR's records are in the drift sweep.
- **Proposed fix.** The record is not otherwise wrong, so no byte needs to change before merge. In the dispositions record:
  - say that W1 and W2 were not re-run by the lane at the repair, and that this review re-ran W1-W4 by the test detector at
    `7d408fd9` (`w-mutants-at-repair.json`: 5/86, 5/86, 5/86, 0/86; controls 0/86);
  - give J5's real fragment;
  - read `item4.status`'s "below" as "above";
  - state that `docs/evidence/<subdir>/` records are outside `check_evidence_currency.py`'s population B, and file a bead if that
    exclusion is not intended.
  - If the record is touched again before merge, fix the four strings at the same time.

### N2 — `item4-repair-sweep.py`'s control is written, not computed (severity: low; test quality)

- **Evidence.** [Observed]
  - The tool writes `record['control'] = {'commit': repair_full, **baseline, 'killedBySweep': False, 'note': 'the unmutated repair commit defines the threshold, so it cannot be killed by it'}`.
    No mutant-free row ever goes through the kill rule.
  - My mutants (§3.7):
    - T5 (`>` → `>=`) exits 0 with both rows killed.
    - T2 (the threshold taken from `b214ef10`, the stale baseline this tool exists to replace) exits 0 with both rows killed.
    - A computed no-op row (I1: a comment line added) survives under the committed rule and is "killed" under T5. One such row would
      have made T5 fail the tool.
  - T1, I2, I3 and I4 fail as they should, and R0 reproduces the committed output.
- **Failure scenario.** A later reuse edits the kill rule to `>=`, or points the baseline at a stale commit. The tool still prints
  both rows "killed", `allKilled` true, exit 0, and a control "not killed" that was never tested. That is the same class of defect
  that made `item4-mutants.py` unusable at the repair, and the tool would not see it.
  - Test-rigor bar :64-67: a control that asserts what it was told "verifies nothing".
- **Proposed fix.** On the tool's next reuse (none is needed for this PR's claims):
  - run a no-op mutant (a comment-only edit) through the same `counts` and kill rule, and require `killedBySweep` false;
  - optionally assert the baseline equals `population-audit.py`'s reach rule at the named commit, and that commit's own figures in the
    record.
  - Name the residual in the dispositions record.

### N3 — The PR body still gives the GP-Q0 reason round 1 rejected, and round 1's N1 text is unchanged (severity: low; disclosure)

- **Evidence.** [Observed] In the PR body as of `2026-10-27T10:48:53Z` (`pr-body-2.md`):
  - line 20 still reads "GP-Q0's stop clause (a gate's accept/refuse outcome changing) is not triggered: the preflight is a
    developer-checkout check, not an owner-act, consent or authority gate." Round 1 §2.3 rejected that reason ("a preflight that
    refuses to proceed is a gate") and ruled the clause not triggered for a different one: the change restores the preflight's
    pre-#530 coverage, the move followed through.
  - Item 3 still says the checkout "was exit 0 and failed later at the first import". "Every changed output" still says "One. The
    install preflight". Both are what round 1's N1 asked to correct, in the dispositions record and the owner notice: the failure is
    at `tsc -b` in `build:poc`, and the entry commands' refusal output changes.
  - The repair corrected the title, the class 3 and 4 lines and the Authority line, as the ruling asked, but not these.
- **Failure scenario.** The owner, or a later lane, reads the PR body as the change record (CC-REV-1: "The change record states which
  classes the change touches"). They take the preflight to be outside GP-Q0's "gate". The next preflight that refuses something new
  then lands as "not a gate" without the follow-through test round 1 applied.
- **Proposed fix.** The PR body is not in the frozen subject, so correcting it retires nothing. Before landing, or in the dispositions
  record and the owner notice:
  - replace line 20's reason with round 1's ruling, naming the `6.2` counter-reading;
  - carry round 1's N1 wording for item 3 and for "Every changed output".

### Round 1's notes after the repair

| Round-1 note | Changed by the repair? | Moot? |
|---|---|---|
| N1 entry commands' refusal output, and "failed later at the first import" | No. The PR body text is unchanged (N3) | No |
| N2 C1 and C2 dumps carry no provenance | No. `derivation-inputs/` and those pins are unchanged | No |
| N3 the preflight checks existence only | No. The script and test blobs are unchanged | No |
| N4 record labels | Partly. The item-4 rows' `commit` still names scratch commits absent from the repository (9 of 9 by `git cat-file -e`), and so do the two new repair rows. The new output file adds `commitNote: "a scratch commit in a throwaway clone, reachable from no ref"`, but the record's copy of those rows leaves it out. `survivesAtBase` is unchanged. The PR body's "each is killed by exactly the new row" is unchanged (line 40) | No |
| N5 PR-body figures with no record | Partly. The full-suite figure now has a record entry (`item4.repair.fullSuiteAtRepair`) and a committed log, bound by sha256. "531" is gone from the PR body. The battery (now 114 commands), `check_governance` and `typecheck` figures are still in the PR body only | No, for those three |
| N6 the `deep-freeze.test.ts` comment | No | No |
| Round 1's `junitDigest` work (§3.4 equivalence, the cross-build probe, M6, the §3.5 closure edge) | — | **Moot.** The file is back to its base bytes, and the closure is identical to main's |

## 6. Every changed output

[Observed] unless marked.

1. **The repair, against round 1's head.** `test-artifact-verification.ts` returns to its base bytes, so `junitDigest`'s output
   (`OperatorReportedTestArtifactRecord.digest`) is the base's by identity of the source. The built file again holds
   `createHash=2`. Family A of the differential is equal by construction. Nothing else in any product changes.
2. **The whole PR, against main.**
   - (a) The install preflight and the two entry commands, as round 1 §5 items 1-2 state. They are unchanged by the repair (same
     script blob).
   - (b) The walkthrough-judgment fixture's inputs and verdicts: none. 25 of 25 rows are equal, and my re-run output is byte-identical
     to the base's.
   - (c) `dist`: `createHash` is gone from the fixture's built file only.
   - (d) Tests: +19, with none edited or removed. The repair adds and removes none.
   - (e) `check_evidence_currency.py --rev` (not in the battery): the 4 records drift as in §3.8, the same at the merge, the repair
     and the head.
   - (f) The SEC-3 closure: identical to main (54 files, every blob equal, 9 importers of `@syzygy/support`).

## 7. Test quality

- **The guard is a real detector of this change.** With the round-1 bytes in place it fails one named test, with a message that
  names the import (`expected [ 'imports @syzygy/support' ] to deeply equal []`). With the repair it passes. That is test-rigor bar
  :42 seen working on the PR's own first version.
- **The kept fixture half** is still covered by detectors that kill a wrong digest: W1-W3 at 5 of 86 each at `7d408fd9`. W4, the
  equivalent copy, is killed by both sweeps' reach rule and survives the tests. That is by design and named.
- **The differential** fails on a real fixture defect (25 of 40 rows, exit 1) and is byte-stable when restored.
- **`item4-repair-sweep.py`** reproduces, and fails on a wrong threshold, commit or fixture. Its control is not computed (N2).
- **The record checks** catch one-field edits (three of three).
- **Growth.** The repair adds no test and removes none, so the PR stays at +19 ~0 −0. Round 1's bar-10 reading stands.

## 8. Cleanup

- Deleted:
  - my scratch clone `rev-538b/clone`. It held the reviewer merge `844dd777` and the scratch mutant commits, none of them pushed;
  - `rev-538b/mutwork/`, the per-case copies of the lane's four tools and the throwaway clones;
  - the four `ec-*.json` outputs (about 304 KB each, digests in §3.8) and their four empty `.err` files;
  - `tools/__pycache__/`;
  - every private TMPDIR I made: `/tmp/r538b-b`, `-ci`, `-full`, `-g`, `-m`, `-w`.
- Afterwards, `ls -d /tmp/r538b-*` gave `ls: cannot access '/tmp/r538b-*': No such file or directory`.
- Nothing outside my TMPDIRs and `rev-538b/` was deleted. No process outside my own tree was signalled.
- I touched no worktree under `/home/tze/GitHub/syzygy/.worktrees/`. I pushed, commented and merged nothing, and ran no `bd`
  mutation.
- Kept, under `rev-538b/`: 54 files, none over 300 KB (the largest is `governance-merge.txt`, 178,477 bytes). This raw is not in the
  table.

| File (relative to `rev-538b/`) | sha256 |
|---|---|
| `basename-citers.txt` | `c596a5880f169fcd9934c882d4f55577d751a4a31dd55910bfed7dfecec05485` |
| `battery-count-out.txt` | `37db48e1e81b32ef1741f179e904c4f40ea8c14603a45fd6bfef5ca63214c5b6` |
| `build-head.log` | `597b358eb98f417637ea8ee02d8d875627f8aea14c146672ac6e228f81cae5a6` |
| `build-merge.log` | `597b358eb98f417637ea8ee02d8d875627f8aea14c146672ac6e228f81cae5a6` |
| `build-typecheck-head.txt` | `5b2fcffe76bd6d30b6df2b00bb94d7895261b4a8a78fd12e99791dd6e8bfb3d9` |
| `check-record-r2-mutants.txt` | `33e5ce64eaedc9d39d0f7967ab6130064c2b3d0ec04ccfc63911ebaf6b23cb61` |
| `check-record-r2-out.txt` | `ded4c00046dd8ae97d5c562ff62982383f05af5dc117ea56e88e58a4d5ff10b1` |
| `closure-equal-out.txt` | `c68819ea81b6fa00cec045e3de3bfb95c2a6f5106e2fe0687fc4740f2b51bc4b` |
| `compare-suite-logs-out.txt` | `66dae0998b0274255f65c602295954f68105eb1c7015fb9b2c39d0659a17d2f9` |
| `differential-rerun.txt` | `cbfa68a571fbf86e6ad5c330645bff9717989cda22e1e344361fac3b869ea845` |
| `dirscan-tests.txt` | `d448969a6e19784ea1dc8584421efae9ca372bc984f57e447eaf8617d12d5a58` |
| `ec-compare-out.txt` | `40e8b0894b0fad7e8a33b45596b8a36775d08e8449dc1d140398139a13b268b5` |
| `full-suite-head.log` | `0957b5075e4ce38c0e7069fdc787125dfe303fae6da7807d7c4f6c5aa77392a2` |
| `full-suite-head.meta` | `a3454dd1c42f762dd094df09254b0729633be518b2482da5d0ab908f8d8e345f` |
| `governance-head.txt` | `7c84694066fb6965543dd24381192ea55397f6ad3ec01bc84553c8482b6c18ac` |
| `governance-merge.txt` | `be20d04ade1209f8b902b2b234619dbdcbe681f94a2f99f1b46857d02fbe12f0` |
| `guard-coverage-out.txt` | `082c6b25336270e88ac6f8895cc4cab762063882e6e643d51e625c0390eec243` |
| `guard-mutant-663061c4-blob.txt` | `e8ce92ddad53e515f694dd26fd7e4f6a977309c79a253a73d03be3a7c580240d` |
| `hosted-checks.txt` | `eb9892df594b3da4d191028859b1f88710605ab5fac45a032f82c4ec76f02a5a` |
| `identity-out.txt` | `234f72c869d3fd1e68b782edc900f1edeb550a14ef630a72030af3d78cc00d79` |
| `import-guard-sweep-7d408fd9.txt` | `fa9bdc195a145e5bc532ad71b2ed6facd8264eea6ab21f84649fe1f360813012` |
| `item4-mutants-threshold-check.txt` | `ee1ae34044905ea4409be56f9e347b282d49e0089351fa0cce33113c58f7b334` |
| `main-overlap.txt` | `e289d8bf9afc30624c8298db333b7638311c991bb3c81b46d9ec385264da99ed` |
| `merge-setup.txt` | `fe8da74b49fe5f4e857e82835b3a5e4de5a02a49d9b05fbd20a01e66d490a477` |
| `npm-ci-head.log` | `caf887aa92082aff6be5e7bd8da59ce4c454f22b2549231cc4adae9ad93b4c3b` |
| `npm-ci-merge.log` | `8948f6f3246243344b904ec08788e37e94fa7dfc6eb823af96968c041b60ac4b` |
| `own-sweep-mutant.txt` | `8357e0790c395910aa9c9049b8970fc5ba50a2882a4d60c48d7e481d8959641c` |
| `own-sweep-out.txt` | `479b481af53036bdd7cde7147bec53edec7863fff2aa2295b40d4dce098a3f45` |
| `pr-body-2.md` | `55752e76a6d85e1f6b2474fca6593abe5c8ea4d3fbf559948a74aa1354f28235` |
| `pr-body.md` | `d198625c84814fbf07386ab51c53e16b5d6864f12fcba3ac3671ab04e13707df` |
| `quotations-head.txt` | `c664dd60aaecc6f410eb86967de57c59f594917e66e88e6bbc71c4b5de35d27f` |
| `quotations-merge.txt` | `aa22e350c5e91b65a02fd29d247109e52839e2a790a6bf2a875a994420cb5662` |
| `r0-vs-committed.txt` | `ee40e9e6007aa2668d62a2c3d83e2b117fb75c165838d5da036b88217258ed8f` |
| `record-diff.txt` | `7b671b523827041598c89f01b55b739d6ecadee57ccf2f046e54dafd50b81937` |
| `repair-sweep-mutants-out.txt` | `9cde656b3f70e53477a9a87955f12e19c2ab540c0949aaa594eb2c16be03bb30` |
| `repair-sweep-mutants.json` | `688168c353a5f87058a6edede7a1d9e4b12f7361de4f7126f673ca0b6affee6f` |
| `run-files-merge.json` | `28ad64360995cbad734990f38ea2966884b15b6897892dc0433b5b7f44a9c0f1` |
| `run-files-merge.txt` | `d8ee58e8a283c7efba3b9a9fe9d22c943937d5265d704645036898b6ba17f00c` |
| `tools/battery-count.py` | `7cd36c9bda26a93f3aba0d4d9e30ec5bff91c0393c395778cfaa5d016c810e84` |
| `tools/check-record-r2.py` | `866c42a9a4d280410882992aa60f737dda1f88acdaaf7369749260e9fa065689` |
| `tools/closure-equal.py` | `5ad8d220ff29825d3a6141054635b411d8458a521a9a324def17d9f428fa431b` |
| `tools/compare-suite-logs.py` | `a672f6c68a1261243b2c4b01af8b82cdbaca03183c36a4326c2cc0ff68369aad` |
| `tools/ec-compare.py` | `77c9b5e5276179091f9eb2ad3db7b9cf30fe22d5959d75e8519fcb9fa2abbc0c` |
| `tools/guard-coverage.py` | `4d9bed7f84b5d6676e8e23a45848cb77b6c586a5f63eff01aea8071770276f3f` |
| `tools/identity.py` | `9eeea30781b09063658a4e425d0d0bebd552b39b9978ede68d9d8f4593f26b0c` |
| `tools/import-guard-sweep.py` | `e3fc674a7cbb1b171c56fb28f5d3a96b3938e6dc0f7ada4b5a6df2e70fb5f8e8` |
| `tools/main-overlap.py` | `b29b7da750614fe5d34e0c4930a209a67eff2e63b5882f4aab233553078f2a10` |
| `tools/own-sweep.py` | `342778ddc046861eaeaaca87f5dc2207a5b362ca7f014196a51f6fb2c13c69c6` |
| `tools/repair-sweep-mutants.py` | `5348d2a5c4647f92dc5ffe89a90da58eb5748c1e60eb815c6d4edd86b9c9943c` |
| `tools/run-files.py` | `e67eb064b3c1b90628ea23e878ca8e62c41c1c01ba9cf2579577288d5f647f0a` |
| `tools/w-mutants-at-repair.py` | `ca376361fb868d06a4ed33decc1870aac594dbbf4a7bd351f89d985fd0992502` |
| `typecheck-head.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |
| `typecheck-merge.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |
| `w-mutants-at-repair.json` | `de5a5af9c8247b7ddab4668bb01f7398d5d4172560267b9e99b6e37e681e15d0` |

Notes on the kept files:
- They re-run against any clone that holds `f7477f52`, `663061c4`, `b214ef10`, `4b9a4be0`, `c7ed9ef2`, `7d408fd9`, `eb8fb6cb` and
  main `41932c3b` under `gh/main`.
- `tools/closure-equal.py` loads `tools/guard-coverage.py`. `tools/repair-sweep-mutants.py` and `tools/w-mutants-at-repair.py` read
  the lane's tools from the clone. They never write to it, except that `w-mutants-at-repair.py` writes a fragment and restores it.
- `npm-ci-head.log` records `npm-ci-exit=` empty: zsh has no `PIPESTATUS`. The merge's `npm ci` exit is in `merge-setup.txt`.
- `pr-body.md` and `pr-body-2.md` are the PR body at my first fetch and at `2026-10-27T10:48:53Z`.
