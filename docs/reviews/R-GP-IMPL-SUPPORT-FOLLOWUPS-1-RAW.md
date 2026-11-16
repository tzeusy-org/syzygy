# R-GP-IMPL-SUPPORT-FOLLOWUPS-1 — CC-REV-1 implementation review of syzygy-bpyt.6.13, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 663061c4
Subject: r1-review.diff sha256 ca08e373a8d94e01dea67d95a8f7822940622a3c180fc9990d96d0a763773916

Reviewer: fresh-context CC-REV-1 reviewer (Claude Opus 5.5), 2026-10-27. I did not author this change and did not edit it. Every
run below was made in my own scratch clones of `/home/tze/GitHub/syzygy` under `rev-538/`, with private TMPDIRs `/tmp/r538-*`,
on Node v24.6.0 and npm 11.5.1. No observed-repository body was read. The fixture paths quoted below (for example
`src/butlers/identity.py`) are synthetic test fixtures in the subject, not Butlers content.

Six notes (N1-N6), no blocking finding. The main judgement is the install preflight's exit code under GP-Q0. I rule that it does
not trigger the stop clause: the coordinator's premise holds against the bytes (§2.3). N1 asks for the owner notice to name the
change to the entry commands' refusal output, which the PR body leaves out.

## 1. Subject identity checks

| Check | Result |
|---|---|
| `sha256sum lead/b613/r1-review.diff` | [Observed] `ca08e373a8d94e01dea67d95a8f7822940622a3c180fc9990d96d0a763773916`. Matches the brief. |
| `git diff f7477f52 663061c4 \| sha256sum` | [Observed] `ca08e373a8d94e01dea67d95a8f7822940622a3c180fc9990d96d0a763773916` again, so the diff file equals the commit diff. `--shortstat`: `32 files changed, 4334 insertions(+), 8 deletions(-)`. |
| `git diff f7477f52 b214ef10 -- apps packages scripts \| sha256sum` | [Observed] `7eb6c896dd4f49ce23af62319d2407e5c286b4ad10dd27b2771b1c3bf2c70688`. Matches. `14 files changed, 243 insertions(+), 8 deletions(-)`. |
| Code delta after `b214ef10` | [Observed] `git diff --stat b214ef10 663061c4 -- apps packages scripts` is empty. `git log -1 663061c4 -- apps packages scripts` is `b214ef10`. |
| Merge base | [Observed] `git merge-base f7477f52 663061c4` = `f7477f52c49ee347f96b92703887c31f6be49e07`. `f7477f52` is the #530 merge (parents `e5080f4d`, `babb5126`). |
| Branch head on GitHub | [Observed] `agent/syzygy-bpyt.6.13` = `663061c43f111c162765478c2001ccdba98dd1fa`. GitHub `main` = `bb05df7ea409039c5a6465e7179f9d0c66931ad3`. |
| Paths main changed since the base, intersected with the subject | [Observed] 152 paths changed (`docs` 144, `packages` 6, `apps` 2) and 32 subject paths. The intersection is 0 by `comm -12` and 0 by a Python set intersection (two methods). |
| `git merge-tree --write-tree bb05df7e 663061c4` | [Observed] exit 0, tree `44309cbf65674da88d0da6f5d3f0ff5d242b7adc`. My local merge commit `f25a3fbc` (parents `663061c4`, `bb05df7e`) writes the same tree. |
| Lane tool digests (record `tools`) | [Observed] 5 of 5 equal sha256 of the tool bytes at `663061c4`. |

## 2. Clauses relied on, the class ruling and the GP-Q0 ruling

### 2.1 Clauses (quoted at `663061c4`)

- GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
  - :51 "Behavior-preserving refactors may proceed under the acts already in force. They may touch `apps/**`, `packages/**`, `scripts/**`, tests, CI and root manifests."
  - :52-53 "\"Behavior-preserving\" means none of the following changes:" / "a rendered byte, a wire format, a refusal string or an exit code;"
  - :62 "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4 (security), and class-6 pull requests that remove an endpoint."
  - :64-66 "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;" / "a rule-6 mutant for each predicate;" / "a non-blocking owner notice in the cycle report."
  - :83 "### Part 3 — these output-changing beads are approved as listed"
  - :88 "| `6.2` | One non-human-principal rule. Refusal reasons change for inputs that are already refused |"
  - :95-96 "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
  - :31-32 "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
  - :33 "2. **graph identity** — entity identity minting, continuity, split/merge"
  - :35-36 "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
  - :37 "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - :38 "5. **data migration** — `.syzygy/**` schema migrations, any"
  - :40-41 "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
  - :45 "**Class membership is contested by default and is never finally determined"
  - :51 "**A reviewer or the owner** may reclassify at any time."
- `AGENTS.md`:
  - :27-28 "Anything no act covers is forbidden — before implementing, find the act."
  - :126 rule 6 "Mutate the input and confirm the check fails, per predicate, before trusting it"
  - :128 rule 7 "Run the battery in a clone before calling it green; the report is valid only for that commit."
  - :132 rule 9 "A claim of absence needs a sweep with a denominator."
  - :133 rule 10 "Freeze the bytes a review is bound to; any later edit retires the review."
  - :134-135 rule 11 "An evidence record names its subject and the subject's digest; a record that names neither cannot be re-checked against the bytes it describes."
  - :270-272 "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it ran at; ids and outcomes alone are not re-runnable, and a rebase-merge leaves the recorded commit reachable from no ref."
  - :280-281 "Conformance expected values are hard-coded literals, never imported from the module under test."
- Test-rigor bar, `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` (read with `git show 663061c4:`):
  - :42-43 "**A test is worth keeping only if some plausible bug makes it fail.**"
  - :64-67 "4. **No tautologies** — A test that mirrors the implementation's logic to compute its expected value, or that asserts a mock returned what the mock was told to return, verifies nothing. Expected values are literals or independently derived."
  - :82-84 "7. **A failure names the defect** — Test names state expected behavior"
  - :93-96 "10. **Growth is governed** — A test is worth *adding* only if it catches a plausible bug no existing test catches"

### 2.2 Class ruling

My ruling is classes **1, 3, 4 and 6**. Classes 2, 5 and 7 are not touched. This agrees with the author's proposal.

- **Class 1, touched (test-only).** The F3 pin censuses the body-read-authority evaluation (`body-read-authority.test.ts`, new
  case). No production authority file changes: `body-read-authority.ts` is byte-identical from `f7477f52` to `663061c4`
  [Observed]. A pin on an authority evaluation's immutability guards the boundary, so I keep the class.
- **Class 3, touched.** The C1, C2 and C3 pins are observation and evaluation identities (manifest digest, observation digest,
  model artifact digests), and C11, R3 and R9 are digest identities. `junitDigest` produces the digest of an observed
  test-artifact record. Its production edit is behaviour-identical (§3.4).
- **Class 4, touched.** `test-artifact-verification.ts` is in the SEC-3 live-verification closure, and it gains an import edge to
  `@syzygy/support`. That package was already in the closure at the base through `model.ts` (§3.5), so the closure keeps the same
  54 files.
- **Class 6, touched.** `npm run poc:dossier` and `npm run poc:generator-demo` run the preflight. Their exit code and refusal
  output are something an operator or a script can depend on, and both change for one install state (§5). No endpoint is removed.
- **Class 2, none.** No graph entity identity is minted or changed. The R3 and R9 digests identify clarification questions and
  dispatch claims, not graph entities.
- **Class 5, none.** No store schema or key changes. The R9 journal names are pinned, not changed.
- **Class 7, none.**

GP-Q0's three further checks apply, because classes 1, 3 and 4 are touched (:62).
- **Differential.** Item 4 carries one over a corpus with altered prose: invalid UTF-8, a BOM, multibyte names, non-ASCII and
  lone-surrogate answer text. I re-ran it and extended it (§3.4). For item 3, my three-commit preflight probe over five install
  states plays the same role (§3.3). Item 1 changes no output.
- **Rule-6 mutants.** There is one for each predicate (§3.2).
- **Owner notice.** The non-blocking notice on `syzygy-bpyt.10` is a landing step and is not in the subject. N1 says what it must
  name.

### 2.3 GP-Q0 and the install preflight's exit code (the main judgement)

**What the preflight checked, by the bytes.** [Observed]
- `scripts/check_generator_install.mjs` is byte-identical at `f7477f52^1` and `f7477f52` (the #530 diff is empty for it; its
  last change is `133106eb`, 2026-09-23). At both commits it checks `node_modules/.bin/tsc` and
  `node_modules/@syzygy/polaris-generation-core`.
- At `f7477f52^1`, no tracked file under `apps`, `packages`, `scripts` or `package.json` names `@syzygy/support` (0 files).
  `packages/support/` does not exist, and `@syzygy/polaris-generation-core` has no dependencies. The generation core held its own
  sha256 and deepFreeze code (11 `createHash('sha256')` or local-definition sites in 8 non-test files of
  `packages/polaris-generation-core/src`).
- At `f7477f52`, the generation core's `package.json` depends on `@syzygy/support`, and 55 files import it. Those 8
  generation-core files now import it instead of holding the code.
- So before #530, the core-link check covered the generation core's whole workspace closure, including the code that #530 moved
  into `@syzygy/support`. After #530, it covered the core link alone.

**Did any input that was usable before #530 pass then and fail now?** `tools/preflight-probe.sh` runs each commit's preflight
bytes against install states of one head checkout. Each state then runs `npm run build:poc` (`preflight-probe-out.txt`):

| Install state | Preflight at `f7477f52^1` | At `f7477f52` | At `663061c4` | `build:poc` at the head tree |
|---|---|---|---|---|
| support linked (as `npm ci` makes it) | 0 | 0 | 0 | 0 |
| support link absent | 0 | 0 | **1**, stderr `Generator dependencies are missing. Run npm ci from the repository root, then retry.` | **2**, first error `packages/three-surface-poc-core/src/body-read-authority.ts(37,36): error TS2307: Cannot find module '@syzygy/support'` (46 `error TS` lines in 44 files at the head tree: 43 TS2307 and 3 TS7006 that follow from it; `tsc-error-codes.txt`) |
| support link dangling | 0 | 0 | **1**, same stderr | not built; the target is missing, so it fails like the absent case [Inferred] |
| support an empty directory | 0 | 0 | 0 | 2, same TS2307 (see N3) |
| restored link | 0 | 0 | 0 | — |

[Observed] `body-read-authority.ts:37` is `import { deepFreeze, sha256 } from '@syzygy/support';` at the base, and the file is
unchanged by this PR. So the failing build is the base's behaviour, not something this change introduced.

The answer is no, for any input taken with the tree it is checked against.
- The two newly refused states (absent, dangling) cannot build the base or the head tree.
- Every state that can build passes all three preflights.
- The decisions on the two entries that existed before #530 (tsc, the generation core) are unchanged. Their two clauses keep the
  base's text (`check_generator_install.mjs:4-5`; only the closing `) {` moves to the new line 6), and the lane's I2 and I3 rows,
  which I reproduced, show the head still refuses a missing tsc or generation core with the same message.

There is one literal-bytes "yes", and it is not this PR's doing. A `node_modules` made by `npm ci` before #530 has no support
link. It passes the old preflight and fails the new one. But it was usable only with the pre-#530 tree, which carries the old
preflight. With the base or head tree it fails at the build whatever the preflight says.

[Inferred] Residual: a hand-built layout that resolves `@syzygy/support` through an ancestor directory's `node_modules`, with the
root link missing, would be newly refused. The generation-core check has made the same assumption since 2026-09-23, and neither
`npm ci` nor skipping it produces such a layout.

**Ruling.**
- I reject the PR body's reason that the preflight is "not an owner-act, consent or authority gate". The stop clause (:95-96)
  says "a gate", with no qualifier, and a preflight that refuses to proceed is a gate.
- I accept the coordinator's reading. The change restores the preflight's pre-#530 coverage: the code the core-link check covered
  before #530 now sits behind the support link, and the check follows it.
- This is the test the http-host ruling applied ("Over every path that exists at base, no decision changes", with the base before
  the move). The `syzygy-bpyt.6.15` ruling also applied it ("Adding the prefix restores the gate's pre-#530 refusal set",
  `docs/evidence/host-pins-round-1-dispositions-2026-10-27.md:116-122` on `bb05df7e`).
- The two entry commands accept and refuse exactly the same install states before and after: every newly refused state was
  already refused, by the build.
- So nothing a gate accepts or refuses changes outside the move followed through. The stop clause is not triggered, and the change
  is within the fix direction (bead item 3: "Add the package to the check, with a rule-6 row").

**What the ruling does not cover.** Part 1 (:52-53) counts "a refusal string or an exit code" as behaviour, and for the
already-refused state that string and code do change.
- The entry commands go from exit 2, with 44 `error TS` lines (41 TS2307, 3 TS7006) on stdout and empty stderr, to exit 1, with the one-line instruction on
  stderr (`composite-probe-out.txt`).
- That is the shape of Part 3's `6.2` row (:88, "Refusal reasons change for inputs that are already refused"), which the owner
  listed.
- I do not treat it as a stop, because the stop clause covers accept and refuse, and the precedent rulings let a move's follow-
  through land with the owner notice naming it.
- That is the strongest counter-reading, and the owner should see it. N1.

**No other gate changes.** [Observed] The subject has 14 code files.
- 11 are test or test-support additions.
- The 3 production edits are the preflight, `junitDigest` (the same call, §3.4) and the walkthrough-judgment fixture (the same
  call; 25 of 25 evaluator outcomes equal).
- `buildOperatorReportedTestArtifactRecord`'s accept and refuse kinds (`built`, `unparseable`, `inconsistent`) are equal on all 15
  differential rows and my 8 probe rows.

## 3. What I ran, and the results

### 3.1 Literals: are the expected digests independent? (test-rigor bar 4)

- **14 literals by a method that imports no module and no hashlib.** `tools/derive-coreutils.sh` types each pre-image by hand from
  the test and module source and hashes it with bash `printf` and coreutils `sha256sum`. The pre-images:
  - C3: the five `butlersFixture()` file texts, `model.test.ts:31-40`.
  - C11: `JSON.stringify` of `QUESTIONS`, written out by hand, `dossier-evaluation.test.ts:42-49`.
  - R3: the three `[id, question, scope, reason]` tuples, `dossier-profile.ts:119-128`.
  - R9: `run-one` NUL stage NUL ordinal, for ordinals 0-4.
- `tools/compare-literals.py` reports `literals=14 matched-exactly-once=14 mismatched=0` at `663061c4` and
  `literals=14 matched-exactly-once=0 mismatched=14` at the base (the literals are new). A one-character mutation of the input
  gives `mismatched=1` (rule 6). The lane's `derive-literals.py strings` agrees on all 14: `14 pairs 14 equal`.
- **C1 and C2, a third method.**
  - A scratch-only test, never committed, appended to the two test files dumps `derive().manifest` and `observed().observation`
    at `663061c4`.
  - Both dumps are **byte-identical** to the lane's `derivation-inputs/manifest-dump.json` (sha256
    `104ce3fdf993d8ca93181660d41f05c5c5f74b96897fcfe2edf0ae9165115be4`) and `observation-dump.json`
    (`a9ee883767f47c7b15950ddbc4a84a7e66aff8817fb266ccb513e5cf09e1eb4c`).
  - `jq -S -c` (deleting `digest`, or `observationDigest`, the top-level `capturedAt` and each stamp's `capturedAt`) piped through
    `tr -d '\n' | sha256sum` gives `sha256:ef8f9f0a722c28406e434ffe3d0706565c02dd5b9f56c4a5d05aead1fffc1373` and
    `sha256:adeac2c5388357ea3b14ab865f65cb6864753a95f98553fe5fdce0b1f03cb428`. These equal the literals at
    `project-shape-manifest.test.ts:523` and `project-shape-observation.test.ts:526`.
  - The dumps have no non-ASCII character, so the code-point versus UTF-16 key-order caveat in `derive-literals.py` does not
    bite.
- **Is `derive-literals.py` a second method, or a re-run of the module?**
  - For C3, C11, R3 and R9 it is a second method: typed pre-images and hashlib.
  - For C1 and C2 it is a second method for the canonical-JSON-and-SHA-256 step only. Its input is a dump of the module's own
    output, and it exits 0 only when the derived digest equals the module's (`equal`). So it can confirm the module's value but
    never originate a different one. It is not a re-run of the module.
  - The literals are typed in the tests, not imported. That meets `AGENTS.md:280-281` and bar 4. The body is a golden by design,
    as the record's `limits[1]` says. Provenance gap: N2.
- `derive-literals.py --selftest`: 7 of 7 `ok`, exit 0. `derive-literals.py manifest` and `observation` over the lane's dumps give
  `"equal": true` twice.

### 3.2 Rule 6: the lane's pins, reproduced

- **The lane's tool, all 22 rows at both commits.** `tools/lane-pins-mutants.py` is a byte copy of the lane's `pins-mutants.py`
  (sha256 `03b0079c94df645162f2987d9792c0559e303e7f3114b0d48b8dbfeff6ef6ac3`, equal to the record). I ran it in a separate clone, base `f7477f52` and head `b214ef10`, with TMPDIR
  `/tmp/r538-pins`. Result (`pins-rerun.log`):
  `{'mutants': 19, 'killedAfterAndSurvivedBefore': 19, 'negativeControls': 3, 'negativeControlsPassing': 3, 'controlProjectsPassing': 6, 'controlProjects': 6, 'rowsNotOk': []}`.
  The six unmutated controls at the head report `0 failed of 1122`, `2159`, `41`, `23`, `4` and `6`.
- **My re-run against the lane's record.** `tools/compare-pins.py` gives
  `{"rowsLane": 22, "rowsRerun": 22, "controls": 6, "summaryEqual": true, "differences": []}`, exit 0. Same commits, exits,
  totals, failed counts and failed-test names. Emptying one row's failed list makes it report the difference, exit 1.
- **Who kills what at the head** [Observed]:
  - C2, C3, C11, F1, F3, R3, R9 and D3 are each killed by exactly one row, the new one.
  - C1 is killed by its own row and the C2 row. Both are new, and the observation embeds the manifest digest.
  - D1 is killed by the new row and by the pre-existing `deepFreeze terminates on a cycle`, which also kills it at the base.
  - The I and H rows sit in new files. I4 and I6 are killed by 4 rows, I5, H1 and H2 by 2, H3 by 3, and I1-I3 by 1. Each is the
    row named for its entry.
- **Survival at the base** is over the owning selection: core 1113 tests, generation core plus dossier 2157, the three
  durable-lifecycle files 40, support 22. This is disclosed in `limits[0]`.
- **My own runner, five lane mutants on the owning file.** `tools/own-mutants.py` is a separate implementation:
  - `L-C11-at-base survives exit=0 failed=0/33`, `L-C11-at-head killed … 1/34`.
  - `L-R3` 0/19 then 1/20.
  - `L-R9` 0/4 then 1/5.
  - `L-F3` 0/322 then 1/323.
  - `L-D3` 0/5 then 1/6.
  - Each head kill names only the new row.
- **The record checked against git objects.** `tools/check-record.py` runs against `663061c4` and makes 169 checks, 169 `ok`
  (`check-record-out.txt`):
  - the base and tested commits resolve;
  - the tested commit is the last code commit;
  - the own-delta digest and its 14 paths;
  - the 5 tool digests;
  - for every pins row and side, `old` occurs exactly once in `file` at the commit it ran at;
  - each failed count equals its list;
  - each exit agrees with its failures;
  - each `ok` flag follows from the exits;
  - every killing test file exists at the head;
  - the summary counts recompute.
- **The restated sections.** `tools/cross-check-sections.py` checks the main record's restated mutants (item1, item3, item6 and
  the negative control) against the pins record: `{"restated": 20, "pinsRows": 22, "notRestated": ["N2-freeze-comment-only", "N3-census-comment-only"], "disagree": []}`.
- **Item 4's record.** `tools/check-item4-record.py` gives 9 of 9 rows `ok`:
  - `old` occurs once at the record's `head` `b214ef10`;
  - each detector's `killed` flag follows from its exit and counts;
  - `killedBy` matches;
  - the control is killed by nothing.
  - Every row's `commit` is a mutant commit absent from the repository (`mutantCommitInRepo=False`, 9 of 9). N4.

### 3.3 Item 3: the install preflight

- The probe is in §2.3. The entry commands, with the support link removed (`tools/composite-probe.sh`, `composite-probe-out.txt`):
  - `base-f7477f52 poc:dossier support-link-absent exit=2 stderr-first='' stderr-lines=0`, and the same for `poc:generator-demo`.
    stdout carries 44 `error TS` lines each. A separate fresh-clone run gives 41 TS2307 (`Cannot find module '@syzygy/support'`)
    and 3 TS7006 (implicit `any` in `dossier-prompts.test.ts`, which follow from the missing types) in 42 files
    (`tsc-error-codes.txt`).
  - `head-b214ef10 poc:dossier support-link-absent exit=1 stderr-first=Generator\ dependencies\ are\ missing.\ Run\ npm\ ci\ from\ the\ repository\ root\,\ then\ retry. stderr-lines=1`,
    and the same for `poc:generator-demo`.
  - The link was restored after each run. Nothing was generated in either case: at the base the build fails before any
    generator code runs.
- "The script had no test" [Observed]: at `f7477f52`, `git grep -l -F check_generator_install` finds only `package.json` and four
  docs files. No test file names it.

### 3.4 Item 4: `junitDigest` and the fixture

- **Equivalence by source** [Observed].
  - Before: `createHash('sha256').update(rawJUnit).digest('hex')`.
  - After: `sha256(rawJUnit)`, which is `createHash('sha256').update(value).digest('hex')` (`packages/support/src/sha256.ts:5`,
    unchanged since the base).
  - It is the same call on the same object, with no conversion: the `string | Uint8Array` parameter is type-only. The fixture's
    local `sha256(text: string)` was the same call on a string, so its replacement is identical too.
- **The differential re-run** (lane's `junit-fixture-differential.mjs`, built clones; `differential-summary.txt`):
  - My base, base re-run, head (`663061c4`) and `b214ef10` outputs, and the lane's two records, all hash to `8f58818c4a978473e4a8463f56701248f0d8c3ad8b6d13dc8b852f71074750bb`.
    That is six byte-identical files.
  - `compare-rows.py` base versus head gives `rowsCompared 40, rowsThatDiffer 0`, exit 0. `--selftest`: 7 of 7 `ok`, exit 0.
  - Totals: 11 built rows, all 11 equal to the oracle, 11 views of larger buffers, outcomes absent 10, lawful 10, unlawful 5.
- **Mutating the differential** (rule 6):
  - one digest in the head output edited: `rowsThatDiffer 1`, exit 1;
  - the built `junitDigest` made to hash `new Uint8Array(rawJUnit.buffer)`: 9 of 40 rows differ, exit 1;
  - the built fixture's sha256 swapped for a latin1 local copy: 25 of 40 differ, exit 1.
  - After restoring, the output is byte-identical to the base again.
- **Inputs outside the lane's corpus.** `tools/junit-crossbuild-probe.mjs` builds records with the base and the head builds over
  the same bytes, and compares each with **coreutils `sha256sum`** of a file holding the view's bytes (`junit-crossbuild-probe-out.txt`).
  - The 8 rows: the real CLI read path (`readBoundedRegularFile`, byteOffset 0 in a 4,194,305-byte allocation), a pooled small
    Buffer (byteOffset 4304), a Buffer subarray and a `Uint8Array` view at byteOffset 4151, a `SharedArrayBuffer` view at
    byteOffset 7, a `Uint8Array` subclass, invalid UTF-8 and an empty array.
  - Result: `{"rows":8,"bad":0}`. 7 are built, each with `baseEqualsHead:true` and `headDigestEqualsSha256sum:true`.
  - The empty array is `unparseable`. It never reaches `junitDigest`, because a zero-byte file has no `<testsuite>` root. That is
    equal at both commits.
  - This closes the record's `limits[3]` (no SharedArrayBuffer view, no subclass) for those two shapes.
  - With the built head mutated to hash the backing buffer, the probe reports `{"rows":8,"bad":6}`.
- **The record that carries the output.** `junitDigest`'s output is `OperatorReportedTestArtifactRecord.digest`.
  - It is built at `test-artifact-verification.ts:368` (`digest: junitDigest(input.rawJUnit)`).
  - It reaches the operator through `npm run poc:capture-test-artifact`: `ingestTestArtifact` at `capture-test-artifact.ts:132`,
    then `io.writeRecord(stateDir, result.record)` at `capture-test-artifact-main.ts:139`.
  - No operator-visible digest can differ. That is [Observed] on 15 plus 8 inputs and [Inferred] for all inputs from the identical
    call.
  - `fresh-checkout-demo-main.ts:377` has an unrelated local variable named `junitDigest`, which is unchanged.
- In `dist`, `createHash` occurs 2 times in each of the two built files at the base and 0 times at the head [Observed].

### 3.5 The new import edge, by my own walk

`tools/closure-walk.py` reads git objects and follows relative imports plus `@syzygy/cap1-core` and `@syzygy/support` into
`src/index.ts`, from `test-artifact-verification.live.test.ts` (`closure-walk-out.txt`):
- `f7477f52`: `closure files=54 missing=[] supportInClosure=True`, with 9 importers of `@syzygy/support`. The shortest path is
  `…live.test.ts -> packages/three-surface-poc-core/src/model.ts -> packages/support/src/index.ts`.
- `663061c4`: `closure files=54 missing=[] supportInClosure=True`, with 10 importers. `test-artifact-verification.ts` is the added
  importer. The shortest path is the same.
- Negative control `f7477f52^1`: `closure files=51 … supportInClosure=False`.
- The author's claim holds. The closure test (`test-artifact-verification-live-source.test.ts`, 58 tests, unchanged by the PR)
  passes at the head and on the merge.

### 3.6 My own mutants (all at `b214ef10`, owning files; `own-mutants.json`, `own-mutants-m12*.json`)

| Id | Mutation | Outcome | Killing rows |
|---|---|---|---|
| M1 | the preflight checks `node_modules/@syzygy` (the scope directory), not `…/support` | killed 1/6 | `refuses a checkout without support…` |
| M2 | the support check resolves from the script's own directory, not the cwd | killed 1/6 | same |
| M3 | the support clause joined with `&&` instead of `\|\|` | killed 2/6 | `…without support…`, `…without polaris-generation-core…` |
| M4 | `resourceHeadroom: Object.freeze(…)` (shallow; an `isFrozen` on the shell only) | killed 1/19 | `hands out the resource headroom block frozen all the way down` |
| M5 | body-read-authority `return Object.freeze({` (shallow) | killed 2/323 | the new F3 row, and the existing `later correlation renders state (2)…` |
| M6 | `junitDigest` over `new Uint8Array(rawJUnit.buffer)` (the backing buffer, not the view) | killed 1/37 | existing `digests the file's own bytes, which equal sha256sum even when they are not valid UTF-8` |
| M7 | `deepFreeze` walks but freezes nothing (a case that would pass if nothing is frozen) | killed 4/6 | including the new partial-freeze row |
| M8 | the census returns early on arrays | killed 2/4 | `test-frozen.test.ts` rows 1 and 2 |
| M9 | attempt ordinal `+ 1` | killed 1/5 | the new R9 row |
| M10 | artifact digest with the last hex digit replaced (63-character prefix kept) | killed 1/19 | the new C3 row |
| M11 | fixture sha256 replaced by a latin1 local copy | killed 4/30 | `polaris-copy`, three `polaris-walkthrough-readiness` rows |
| M12 | the questions freeze compared with `sha256(text + '\n')` | killed 1/34 at the head; **survives 0/33 at the base** | the new C11 row's second assertion |

- Unmutated control: `CTRL-head-unmutated survives exit=0 failed=0/484`. 22 of 22 rows matched their expected outcome, plus 2
  M12 rows.
- **No mutant of mine survives at the head.**
- M12 shows that the C11 row's second clause ("takes that digest as the freeze") carries a kill of its own. The existing
  `dossier-evaluation.test.ts:87` checks only that a wrong digest is refused. [Inferred] The only test mention of
  `expectedQuestionsSha256` at the base is that line (`git grep` over apps and packages), so M12 survives the whole base suite.
- The brief's example "the preflight checks `@syzygy/support` only for existence, not as a link or package" is not a mutant. It
  *is* the implementation, and its consequence is N3.
- Disclosure: I added the two M12 rows to `own-mutants.py` after its first full run. `own-mutants.json` was produced by the bytes
  without them, and the kept tool differs from those bytes only by those two rows.

### 3.7 Suites, typecheck, governance, battery

| Run | Result [Observed] |
|---|---|
| 17 files at the head `663061c4`: the 10 changed `*.test.ts`, `test-artifact-verification.test.ts`, `-live-source.test.ts` and 5 fixture consumers | `exit=0 files=17 filesRun=17 total=663 passed=663 failed=0` |
| The same 17 on the local merge with `bb05df7e` (after `npm ci`) | `exit=0 files=17 filesRun=17 total=663 passed=663 failed=0` |
| The 15 of those that exist at the base `f7477f52` | `exit=0 files=15 filesRun=15 total=644 passed=644 failed=0`. 663 − 644 = 19, which agrees with `+19 ~0 -0` |
| `git diff --numstat f7477f52 b214ef10` over the test files | 0 deletions in every test file. The only deletions are in the 3 production files (5, 2, 1) |
| `npm run typecheck`, head and merge | `exit=0` both |
| `python3 scripts/check_governance.py`, head and merge | `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted` both |
| `python3 scripts/check_quotations.py`, head | `OK    QC-1  a quotation beside a path:line locator was said by that file — 37 quotations examined in 18 of 952 .md files scanned … 0 findings`. Exit 0 at head and merge |
| PROJECT-STATUS battery (`tools/battery.py`, one command per line), head and merge | `commands=110 nonzero=0` both. The denominator is 110 by the runner and 110 by a separate `awk` count of the block. No `NONZERO` line was printed |
| `check_evidence_currency.py --rev f7477f52` and `--rev 663061c4` | see §5 item 7 |
| The #530 sweep tools (`population-audit.py`, `sweep.py`), read-only, at `f7477f52` and `b214ef10` | 4 of 4 outputs byte-identical to the lane's records. Name rule: 241 files, 6 sites, 1 local sha256, at both. Reachability: 245 files, sites 8 → 6, local sha256 2 → 1 |
| Second-method sweep, `git grep -F "createHash('sha256')"` over non-test `.ts` under `apps/*/src` and `packages/*/src` | 8 sites at the base and 6 at `b214ef10`. The two removed are `test-walkthrough-judgment-fixture.ts:44` and `test-artifact-verification.ts:309`, and the 6 left include `packages/support/src/sha256.ts:5` (`c1c2-and-sweep-second-method.txt`) |

## 4. Findings

No F finding. Six notes.

### N1 — The changed-output inventory leaves out the entry commands, which carry the GP-Q0 Part 1 shape (severity: low-medium, disclosure)

- **Evidence.** [Observed]
  - The PR body's "Every changed output" says "One. The install preflight: a checkout with `tsc` and the generation core but no
    `@syzygy/support` link was exit 0 and is now exit 1 with the same stderr text."
  - It also says the checkout "failed later at the first import".
  - Measured (`composite-probe-out.txt`, §3.3): for that install state, `npm run poc:dossier` and `npm run poc:generator-demo` go
    from exit 2, with 44 `error TS` lines on stdout (41 TS2307, 3 TS7006) and empty stderr, to exit 1, with the one instruction
    line on stderr.
  - The base fails at `tsc -b` in `build:poc`, not at an import.
  - GP-Q0 :52-53 lists "a refusal string or an exit code", and :88 lists `6.2` for "Refusal reasons change for inputs that are
    already refused".
- **Failure scenario.**
  - The owner notice on `syzygy-bpyt.10` repeats the PR body: "the preflight exits 1 instead of 0".
  - The owner never sees that the operator-facing commands' refusal output changed for an already-refused input, which is the shape
    they listed for `6.2`.
  - So they cannot exercise the override that this review's ruling (§2.3) and the two precedent rulings rely on.
- **Proposed fix.** No byte of the subject changes.
  - The dispositions record and the owner notice should state the before and after for both entry commands: exit 2 with 44 `error TS`
    lines on stdout (41 TS2307, 3 TS7006) becomes exit 1 with the instruction on stderr. They should also state the script's own 0 → 1 for an absent or
    dangling `node_modules/@syzygy/support`, and that no install state that can build changes.
  - Both should name this review's ruling with the `6.2` counter-reading.
  - Both should correct "failed later at the first import" to "failed at `tsc -b` in `build:poc`".

### N2 — C1 and C2 re-hash the module's own output; the derivation inputs carry no provenance (severity: low)

- **Evidence.** [Observed]
  - `derive-literals.py` `manifest` and `observation` modes read a dump and exit 0 only when `derived == moduleOwn`.
  - The record (`item1.pins[0]` and `[1]`, `literalDerivedBy.method`) names `derivation-inputs/manifest-dump.json` and
    `observation-dump.json` by path only. It gives no sha256, no producing command and no commit.
  - The test comments (`project-shape-manifest.test.ts:519-522`, `project-shape-observation.test.ts:521-525`) say "Expected value
    derived outside this module … over the manifest without its digest".
  - The PR body says "Literals are derived outside the module under test (Python `hashlib` over canonical JSON), not copied from a
    run".
  - For these two, the pre-image *was* copied from a run. My dump at `663061c4` is byte-identical to the lane's (§3.1).
- **Failure scenario.**
  - A later lane regenerates the dump after a fixture or shape change and re-runs `derive-literals.py`. The tool can only re-bless
    whatever the module now emits, and nothing records which dump the current literal came from.
  - A reader trusting the comment believes the manifest was typed, as the 14 string pre-images were.
  - This does not weaken the C1 and C2 pins as mutation killers: both mutants alter the hash step and are killed.
- **Proposed fix.** On the record's next reuse, or in the dispositions record:
  - give each dump's sha256 (`104ce3fdf993d8ca93181660d41f05c5c5f74b96897fcfe2edf0ae9165115be4`,
    `a9ee883767f47c7b15950ddbc4a84a7e66aff8817fb266ccb513e5cf09e1eb4c`) and the command and commit that produced it;
  - say that C1's and C2's pre-images are the module's own output, re-hashed by an independent canonical-JSON and SHA-256 step,
    unlike the 14 typed pre-images.
  - The test comments can say "over the module's manifest without its digest" on their next touch.

### N3 — The preflight checks existence only, and the suite pins that (severity: low; pre-existing form, residual)

- **Evidence.** [Observed]
  - With `node_modules/@syzygy/support` an empty directory, the preflight exits 0 at all three commits, and `build:poc` exits 2
    with TS2307 (§2.3 table). The generation-core entry has had the same existence-only form since `133106eb`.
  - The fixtures create empty directories for both entries (`generator-install-check.test.ts:31`). So the suite cannot tell a link
    from a directory, and a check of `package.json` or of a symlink would fail its passing rows.
  - The row title at `:48`, "passes a checkout holding tsc, the generation core and the support package", says "package" where the
    fixture holds an empty directory. The row at `:61` covers a real install.
- **Failure scenario.** An interrupted or hand-edited install leaves `node_modules/@syzygy/support` as an empty directory. It passes
  the preflight and then fails with the same unclear TS2307 error that N5 meant to remove. Neither `npm ci` nor skipping it
  produces that state.
- **Proposed fix.**
  - Name it as a residual in the dispositions record.
  - Strengthening the check would change what the preflight refuses, and is a separate, owner-visible change. It is outside this
    bead's fix direction.
  - If the row stays, retitle it on its next touch ("…holding entries named tsc, the generation core and support").

### N4 — Record labels, and the "exactly the new row" sentence (severity: low)

- **Evidence.** [Observed]
  - In `item4-mutants-2026-10-27.json`, every row's `commit` (9 of 9) names a scratch mutant commit that exists in no ref of the
    repository (`check-item4-out.txt`). The re-runnable anchor is the record's top-level `head` (`b214ef10`) plus `old` and
    `new`, which I confirmed: `old` occurs once at the head, 9 of 9.
  - In the main record, `item6.mutants[0]` (D1) has a field `survivesAtBase` holding `{"exit": 1, "failed": 1}`, which is a kill.
  - The PR body says "at the tested commit each is killed by exactly the new row". That is false for:
    - D1 (the cycle test and the new row);
    - C1 (two new rows, disclosed in the next sentence);
    - I4 and I6 (4 rows each), I5, H1 and H2 (2 each), and H3 (3).
- **Failure scenario.**
  - A reader checking each row's commit, as the rule-6 record note asks (`AGENTS.md:270-272` at `663061c4`), finds no object for
    any item-4 row and may score the rows as not re-runnable.
  - A reader filtering on `survivesAtBase` counts D1 as a base survivor.
- **Proposed fix.** On the tools' next reuse:
  - name the field `mutantCommit (scratch, never pushed)` beside the head;
  - rename `survivesAtBase` to `ranAtBase`.
  - In the dispositions record, restate the kill attribution as §3.2 gives it.

### N5 — PR-body figures with no record behind them, one with an unnamed population (severity: low)

- **Evidence.** [Observed]
  - These figures appear only in the PR body: the battery `commands=110 nonzero=0`, `check_governance` 32/21/0, "npm run
    typecheck is clean", and "the 12 touched test files together pass (531 tests)".
  - The record contains none of the strings `531`, `battery` or `typecheck` (searched by script over its JSON).
  - The subject touches 10 `*.test.ts` files, which hold 482 tests at `663061c4` (my run's per-file counts).
  - [Inferred] 482 + 37 (`test-artifact-verification.test.ts`) + 12 (`polaris-walkthrough-readiness.test.ts`) = 531 is one
    decomposition that fits, but the files are not named.
  - The battery, governance and typecheck figures reproduce in my clones (§3.7).
- **Failure scenario.** A later reader cannot re-check "531" against any population (rule 9), and cannot tell which commit the
  battery figure is valid for from the record alone (rule 7).
- **Proposed fix.** The dispositions record should name the 12 files, or the selection command, and the commit for the 531, and
  carry the battery and governance figures with their commit.

### N6 — A comment in `deep-freeze.test.ts` misstates where the Proxy throw comes from (severity: very low)

- **Evidence.** [Observed]
  - `deep-freeze.test.ts:36` says "a throw raised mid-walk by something other than Object.freeze leaves a partial freeze".
  - A Node probe gives `Object.isFrozen(proxy)` → `false` (no trap call) and `Object.freeze(proxy)` → throws `trap`. Freezing calls
    `[[OwnPropertyKeys]]`.
  - So in the second case the throw *is* raised by `Object.freeze`, on the member.
  - The pinned states (`[true, false]` and `[true, true]`) are right.
- **Failure scenario.** A maintainer reasons from the comment that a throw inside `Object.freeze` cannot leave a partial state, and
  "fixes" the wrong path.
- **Proposed fix.** On the file's next touch, write "by something other than the owner's own `Object.freeze`".

## 5. Every changed output

[Observed] unless marked.

1. **The install preflight.** `scripts/check_generator_install.mjs` changes from exit 0 with empty stderr to exit 1 with the
   instruction line, for an install where `tsc` and the generation core are present and `node_modules/@syzygy/support` is absent
   or a dangling link. It is unchanged for a linked install, for an empty directory, and for the tsc and generation-core decisions.
2. **The entry commands.** `npm run poc:dossier` and `npm run poc:generator-demo` for that install state change from exit 2, with
   44 `error TS` lines on stdout (41 TS2307, 3 TS7006) and nothing on stderr, to exit 1, with the instruction line on stderr. The PR body does not
   list this (N1).
3. **`junitDigest`**, that is `OperatorReportedTestArtifactRecord.digest`: none. The 40-row differential has 0 differences, and my
   8-row cross-build probe has 0 differences and 7 of 7 equal to `sha256sum`.
4. **The walkthrough-judgment fixture's inputs and the evaluator's verdicts**: none (25 rows equal).
5. **The built modules.** `createHash` is gone from the two `dist` files (2 → 0 each). Their behaviour does not change.
6. **Tests.** +19, with no existing test edited or removed.
7. **`check_evidence_currency.py --rev`**, which is not in the battery: 378 records on each side, none on one side only, 4 changed.
   `current` 21 → 20, `drift` 209 → 210, `driftRecordsWithActionableDrift` 202 → 203. Unchanged: `driftRecordsHistoricalOnly` 7,
   `unknown` 148, `carriesDigestKey` 303. The four, exactly the PR's:
   - `code-structure-ls-tree-z-mutants-2026-10-21-r2.json`, 1/2 → 2/2 mismatched;
   - `code-structure-ls-tree-z-mutants-2026-10-21-r3.json`, 2/2 match → 1/2 mismatched;
   - `polaris-generator-m6-review-correction-evidence-2026-09-23.json`, 6/7 → 7/7;
   - `quote-fidelity-mutants-2026-10-04.json`, 7/10 → 8/10.

   Leaving them unedited is right under rule 10 and rule 11. Each names the digest of the bytes it described at its own commit, so
   an edit would rewrite what those records attest rather than correct them. Drift is the checker reporting that the subjects
   moved, which it is built to do.
8. **The SEC-3 closure**: the same 54 files, with importers of `@syzygy/support` going 9 → 10.

## 6. Verdict per acceptance criterion

The bead has no `acceptance_criteria` field (`null`), so I treat the description's items, and the comment that adds items 4-7, as
the criteria.

| Criterion | Verdict |
|---|---|
| Item 1 (N2): literal-digest assertions, hand-typed or independently derived and never imported; `isFrozen` assertions at each site; a rule-6 run for each, with old/new and the commit | **Met.** 8 predicates pinned. 16 literals re-derived by methods that import no module: 14 by coreutils, C1 and C2 by jq over a byte-identical dump. 19 of 19 mutants reproduced at both commits. N2 and N4 are notes on the record |
| Item 3 (N5): add `@syzygy/support` to the check, with a rule-6 row | **Met.** I1-I6 and my M1-M3 are killed by the new rows. The GP-Q0 ruling is in §2.3, and N1 and N3 are notes |
| Item 4 (round-1 N1): both sites take `sha256` from `@syzygy/support`; a before/after differential for the junit records and the fixture; the sweep re-run under both population rules | **Met.** The differential reproduces byte for byte, and its mutations fail. The probe extends it to SharedArrayBuffer, subclass and CLI-read inputs. Both sweep rules reproduce, plus a second method |
| Item 6 (round-2 N12, optional): a partial-freeze case; getter beside a sibling gives 1 of 2, Proxy `ownKeys` gives 2 of 2 | **Met.** D3 survives at the base and is killed only by the new row. N6 is a comment note |
| Items 2, 5 and 7 left: "On the tool's next reuse" (items 2 and 5) and "for the next probe run" (item 7) | **Consistent with the bead's wording.** None of `site-equivalence.py`, `merge-resolution-check.py`, `diff-probe.mjs` or `support-purity-mutants.py` is named in any of the 21 tracked files under `docs/evidence/syzygy-bpyt-6-13/` at `663061c4` (0 each). `docs/evidence/syzygy-bpyt-6-3/` is unchanged from `f7477f52` to `663061c4`. The two #530 tools reused (`population-audit.py`, `sweep.py`) are not items 2, 5 or 7's subjects. Item 7's intent is applied to the new tools: Node version and build command recorded, `failedTestCount` uncut |
| "Test-only, apart from item 3's install check" | Superseded by the comment's item 4, which adds two production edits. Both are behaviour-identical (§3.4) |
| GP-Q0 review rule (classes 1, 3 and 4): differential, a rule-6 mutant per predicate, owner notice | Differential and mutants **met**. The owner notice is a landing step and should carry N1 |
| "Get a CC-REV-1 review" | This review |

## 7. Test quality (test-rigor bar)

- **Core rule and bar 10 (:42-43, :93-96).**
  - Each of the 19 added tests catches a plausible bug that no existing test caught. The rule-6 base runs show the eight N2 pins and
    D3 surviving at the base. The install check had no test at all, and `test-frozen.test.ts` guards the helper the freeze pins
    stand on (H1-H3, M8).
  - Growth is additions only, with the net delta stated (+19 ~0 −0).
  - Two of the tests are near-duplicate setups in `model.test.ts`: the same `buildPocModel` call is typed twice. That is acceptable
    at this size.
- **Bar 4 (:64-67).**
  - The expected values are literals.
  - 14 are independently derived from typed pre-images.
  - C1 and C2 are goldens whose hash step is independently derived (N2).
  - No expected value is imported from the module under test.
- **Bar 1.** The pins assert observable outcomes: returned digests, journal file names, freeze state and exit codes. They do not
  assert call sequences. The C1 and C2 goldens will move with any fixture or shape change, by design and disclosed.
- **Bar 3.**
  - The failure paths are present: four refusal rows, the rejecting body-read-authority evaluation, and both partial-freeze arms.
  - The preflight's "entry present but not a package" edge is not covered, and the fixtures make it untestable as written (N3).
- **Bar 7 (:82-84).**
  - The names state behaviour and localize the defect: for example M9 fails only `names each dispatch claim by the SHA-256 of its
    request, stage and ordinal`.
  - The one title broader than its fixture is in N3.
  - No title is weaker than its assertions, by my reading of each and by M12, which shows C11's second clause has teeth.
- **Bar 6.** I saw no retries and no sleeps.
  - The install-check rows spawn `node` against `mkdtemp` fixtures under `tmpdir()`, which follows TMPDIR, and clean up in
    `afterEach`.
  - The row "passes this checkout" depends on the running checkout having run `npm ci`. That is a reasonable tie to reality: the
    rest of the suite needs it too.
- **The census helper.** It walks own enumerable string keys and skips `ArrayBuffer` views. This matches `deepFreeze`'s own walk
  (`Object.values`), so the two agree on what "all the way down" means.
  - The `visited` lower bounds (≥ 4 and ≥ 9) are denominators against an empty walk, not counts.
  - A census that stopped early would be caught by H2 and M8, not by those bounds.

## 8. Cleanup

- Deleted: my scratch clones `rev-538/clone`, `rev-538/pins-clone`, `rev-538/base-clone`, `rev-538/merge-clone` and
  `rev-538/tsc-clone`, and every private TMPDIR I made (`/tmp/r538-1`, `-bh`, `-bm`, `-cb`, `-ch`, `-diff`, `-jx`, `-jx2`,
  `-own`, `-pf`, `-pins`, `-tb`, `-th`, `-tm`, `-ts`).
  - `ls -d /tmp/r538-*` afterwards: "No such file or directory".
  - Nothing outside my TMPDIRs was deleted, and no process outside my own tree was signalled.
- No worktree under `/home/tze/GitHub/syzygy/.worktrees/` was touched. Nothing was pushed, commented or merged, and no `bd`
  mutation was run.
- Two empty build logs were deleted.
- A self-check script for this raw's head and table, written by mistake to `lead/b613/verify-raw.py` (outside `rev-538/`), was
  deleted after one run (head exact, 47 rows equal to the 47 files on disk). `lead/b613/` holds only `brief-r1.md` and
  `r1-review.diff` again.
- Kept, under `rev-538/`: 47 files, none over 300 KB (the largest is `governance-head.txt`, 176,376 bytes). This raw is not in the
  table.

| File (relative to `rev-538/`) | sha256 |
|---|---|
| `battery-head.txt` | `e759ad3e005ae77ffce4868e3a9c3d96d9a83ab126ed7ec2181be533ef6b16a7` |
| `battery-merge.txt` | `e759ad3e005ae77ffce4868e3a9c3d96d9a83ab126ed7ec2181be533ef6b16a7` |
| `c1c2-and-sweep-second-method.txt` | `9466b631faae2343ee37c67b8bcbcc046e309bfb8842cfb6466ba338393b218c` |
| `check-item4-out.txt` | `655edb56a475f9db7f3936e3dea389afb97226abf053f70013ed96344e0088e4` |
| `check-record-out.txt` | `1289f1fdf28804add9e7f153654de61d1703b36c2fe7e732cbb79530cca72df6` |
| `closure-walk-out.txt` | `4911bdf7e80a3f195eb9db2237000805eb5f2473abdeedec2772075478da6237` |
| `compare-literals-out.txt` | `dd1565bbe1adaf476c02c7979256e45a8a234edd33690168de1ad1da15a96f27` |
| `compare-pins-out.txt` | `8b37b630fa17dd8c26e7b11c355b8577f5e7c0d47d951c85dbf1a683aea968da` |
| `composite-probe-out.txt` | `1b120a0ea3e8008ea6b150981fc05dd6cc5198bf2353f37bcf0be82ae1c09370` |
| `cross-check-sections-out.txt` | `3f5a555149fb5353a33ac15691f2a28f410c2cadb33318acbad3c7196761c4cc` |
| `derive-compare-lane.txt` | `e7f94b91f125b9e424c320ca4cfd891ead43f91d4848016d2cfb1d7e10b2127e` |
| `derive-coreutils-out.txt` | `f299a0216cc94a0eb306d39ddda464c4af97574e931c682eec99a7cfaea44393` |
| `differential-summary.txt` | `64b7181ead8eb4a82e64b4e20c96c5861330d6e1fae21749f8eeaa87a33cb93d` |
| `evidence-currency-and-sweep.txt` | `a31c10c1a66d6d65a3bfefdb217b376d8e09f080bc512b8a3dbbfbe74d647a23` |
| `governance-head.txt` | `b0cd23a4b7d099a5766b292a00585cd62785323d3254182dd124db9e9784994b` |
| `junit-crossbuild-probe-out.txt` | `c069fcf38b00623fecd54127191db818793b8b429dc59b2d56c076d5debea023` |
| `main-changed.txt` | `758a1e5300f6d3e95ac986ba8f6bef6f3c4aa7a0f78a0c0e96a0cdcce7ba2c92` |
| `npm-ci-head.log` | `a89db0f66e52dae526ecf9c6e0a1e71801f0ac0ae40185274a916a5255ecc087` |
| `own-mutants-m12-base.json` | `87688d39618f89e1c9fba7d3139aa3b06d32f62977fa1f1180ac5ceea64532ee` |
| `own-mutants-m12.json` | `8e366cfa5a74416e726e645bbbd625504776dc89f304e1e22ea4d1a5e2a96db8` |
| `own-mutants.json` | `143dfcf45ff4778ca307a77922cd8af0842b2a4b22c9674e8d67c1f3454aa9ab` |
| `own-mutants.log` | `ae6c2b162b844f30bfb83b7d6c24cb43dcf310e57b690cc0becbbc8003bb12ba` |
| `pins-rerun.json` | `54524dfb44c86f9fb8507b35480acccadafb079148e9979298623d31e2ce216e` |
| `pins-rerun.log` | `241126718f4f0784155f7ee104fee72c8e2167089f9f894b46686960d21fda4d` |
| `preflight-probe-out.txt` | `d9463e9623f29098495d9222da30d505140e139f9dcc48647dbecf2988a91486` |
| `quotations-head.txt` | `1868cba498568e9b17dc851e4827a35a6afba5e06cdbda25be012b2d5d6fdde0` |
| `run-files-base.txt` | `c517a9c6a49c5b8d2050e7992c84bd2a6fc524f62ba907f81007258fa84eefef` |
| `run-files-head.txt` | `f8aac857e932582db52eb2661aae5a90df567964c9b80706109b1d05c43465e8` |
| `run-files-merge.txt` | `931bc9fccc5b771995dcbb71e9d58005c17233c945955531e63607a513a0a4e3` |
| `subject-files.txt` | `5e7c01ed3b16d19c3b911f3ae127ca98a92b91138172b328f5baa2953e8f9571` |
| `tools/battery.py` | `07dd4ea42ef1bbc90cb98a7fe35a51867c27492bf62b530414abbd6cbc5dd8ad` |
| `tools/check-item4-record.py` | `75907bacd43293ef3f17fa041a971f8a410fc986fe91c00b99e753df21b454d8` |
| `tools/check-record.py` | `21cf36a3aa4d69fb5a988d55513f4c4d00dc2af07e15bac1336ce4c4237a54e4` |
| `tools/closure-walk.py` | `afcff48c7608a930d28ca905ff7aa59b889917509a156b54a3ac783ee1a08170` |
| `tools/compare-literals.py` | `90250c3999a72e3e40e1c988102aea803ac6d0689eed15a7c32ed3d293bdffb1` |
| `tools/compare-pins.py` | `08275d75bf3d8add0e310ca7fc973f0e4530a8fc093d8782098892b85c2afbd4` |
| `tools/composite-probe.sh` | `32b33e2aaacc80c193508c169622e5d2d9e4b8db80d6dc8db818f9d0e582bcb9` |
| `tools/cross-check-sections.py` | `b553e7adb2fecee0975388999e083e4830379eddee8c2f0b6451ffcf2ad46970` |
| `tools/derive-coreutils.sh` | `c70644731c159671ae19696f30e35f9f6cec6e9b0b79726827921e892afadf2b` |
| `tools/junit-crossbuild-probe.mjs` | `9ae14d970278e2a14fa867ec9d5623132968ca1082511e5e02d2b26ce3126e82` |
| `tools/lane-pins-mutants.py` | `03b0079c94df645162f2987d9792c0559e303e7f3114b0d48b8dbfeff6ef6ac3` |
| `tools/own-mutants.py` | `dc0705e352ee4d76757f834c088d278b0f76d62e70628b191ee80bc4894a6d48` |
| `tools/preflight-probe.sh` | `8494edcc71898084f5e9e786c9b7e63d8efb57529bbb3631722343fcd2b43a3a` |
| `tools/run-files.sh` | `04d06cb2820eb935cf80b41d739266210a61da65fb8767b19fcc5a4642ca9c5e` |
| `tsc-error-codes.txt` | `da3b1bc77385277afe5f0e0c11eca9219db5d5ac5fd632977a715249774f8d76` |
| `typecheck-head.log` | `16ec4cd0ac6c93c48bb2b0beed58c59bf9624ee2e6eeb774b810ea969fe40edc` |
| `typecheck-merge.log` | `16ec4cd0ac6c93c48bb2b0beed58c59bf9624ee2e6eeb774b810ea969fe40edc` |

Notes on the kept files:
- `tools/lane-pins-mutants.py` is a byte copy of the lane's tool, made only to run it from outside the clone.
- `check-record-out.txt`, `check-item4-out.txt`, `compare-*-out.txt` and `cross-check-sections-out.txt` were produced against git
  objects of the now-deleted `merge-clone`, which held `f7477f52`, `b214ef10`, `663061c4` and `bb05df7e`. They re-run against any
  clone holding those commits.
