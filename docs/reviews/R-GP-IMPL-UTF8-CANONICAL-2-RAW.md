# R-GP-IMPL-UTF8-CANONICAL-2 — CC-REV-1 implementation review of syzygy-bpyt.6.3 stack 2, round 2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: abc40c9a
Subject: r2-review.diff sha256 b73519daf1dbf9b2902bb0a359e70ea6560f49a374b71475aeb3404630b98ab2

Reviewer: independent, fresh-context CC-REV-1 reviewer, 2026-10-27. I did not write this change and did not review
round 1. I saw the round-2 brief, the round-1 raw and brief, the coordinator's routing, the lane's two reports, the PR
body, the subject and its governing references. All work ran in a scratch clone of `/home/tze/GitHub/syzygy` under
`rev-534b/` (deleted at the end), Node `v24.6.0`, vitest `3.2.7`, `npm ci` before any run. No Butlers or other
observed repository content was read; every probe input is synthetic or the PR's own corpus. Nothing was pushed,
commented or merged, and no `bd` mutation ran.

In one paragraph: both round-1 blockers are repaired. S1 and S2 survive at round 1's head (0 failed of 1,149 core
tests) and each dies at the repair by a named new assertion with literal expected values. The `code-structure.ts`
filter is back inside the converting try. The injected-fault test fails when the filter moves out again, and the
Unknown reason on that path is the base's. Both merges check out path for path. The `AGENTS.md` resolution keeps both
sides byte for byte. The merged `project-shape-manifest.ts` is comment-only. The full suite passes at the reviewed
commit, and hosted CI passes. Nothing a gate accepts or refuses changes. Seven notes follow (N1–N7), none blocking. Two
of my mutants survive every committed test and die only to the probe (N1). The BigInt clause added for round 1's N1 is
wrong (N2). The tap's six extra calls are put down to the wrong tests (N3). The digest-citer absence claim is stale at
the head (N4). The rest are smaller record gaps (N5–N7).

## 1. Subject identity checks, including both merges

- **Digests.** [Observed] Each is computed by `git diff … | sha256sum` in my clone, or by `sha256sum` over the file.
  | What | Computed | Brief | Match |
  |---|---|---|---|
  | `git diff 2d3f9375 b329dc9c` | `a132003feb816c21f6926763783da44c0293b476280843f50667f20318c48086`; `19 files changed, 3391 insertions(+), 53 deletions(-)` | `a132003f…` (19 files) | yes |
  | `git diff a5b1d532 abc40c9a` | `9b9464b75598217201ad38b1b6e0e88959896ead328319f5a320e2ac5db6088a`; `4 files changed, 265 insertions(+), 10 deletions(-)` | `9b9464b7…` (4 files) | yes |
  | their concatenation, rebuilt as `rev-534b/r2-review.diff` | `b73519daf1dbf9b2902bb0a359e70ea6560f49a374b71475aeb3404630b98ab2` | `b73519da…`; the lead's copy hashes the same | yes |
  | `git diff 2d3f9375 b81010c8` | `b8a6ef94f036007cbc1b05395bb2fc20570ad340c6d32c20a7664383e05292d8`; `8 files changed, 122 insertions(+), 22 deletions(-)` | `b8a6ef94…` (8 files) | yes |
  | `git diff 41932c3b abc40c9a` | `7a6fc1b50cc2de1f048bc9d3b70d6c0ff1494dd5e3f5bd41eac2103d8f0ef50b`; `47 files changed, 73633 insertions(+), 42 deletions(-)` | `7a6fc1b5…` (47 files) | yes |
- **Refs.** [Observed] `git ls-remote origin` (GitHub) and the local repository both give
  `refs/heads/agent/syzygy-bpyt.6.3-utf8` = `abc40c9a9f82a0e94f89e455331b025ed84a7c4c` (unmoved) and `refs/heads/main` =
  `973965a82f82d9b90af05e4b96524aae0d9dbec4`. The first-parent chain `2d3f9375..abc40c9a` is `b81010c8`, `b329dc9c`,
  `e6afa657` (parents `b329dc9c`, `d38d7a3c`), `a5b1d532` (parents `e6afa657`, `41932c3b`) and `abc40c9a`, as the brief
  states.
- **First merge `e6afa657`.** [Observed] `git merge-tree --write-tree b329dc9c d38d7a3c` exits 0 with tree
  `9cdf8257e0c7adae43aa67fff8789c19c696bc1c`. `e6afa657^{tree}` is the same object, so the commit is git's own merge,
  path for path.
- **Second merge `a5b1d532`.** [Observed] `git merge-tree --write-tree --name-only e6afa657 41932c3b` exits 1 with
  `CONFLICT (content): Merge conflict in AGENTS.md` and `CONFLICT (add/add): Merge conflict in
  docs/evidence/syzygy-bpyt-6-3/repair1-typecheck.log`. It also prints `Auto-merging
  packages/three-surface-poc-core/src/project-shape-manifest.ts`. Git's tree (with conflict markers) is `da6ace18…`.
  Against `a5b1d532^{tree}` (`39d12013…`), `git diff --name-status` lists exactly `M AGENTS.md` and `M
  docs/evidence/syzygy-bpyt-6-3/repair1-typecheck.log`. Both trees hold 5,927 paths, so 5,925 are equal, which
  reproduces `merge2-resolution-check-a5b1d532.json` (5,927 / 5,925 / 2 / 0). That file's `computedTree` (`7c057f49…`)
  is not my `da6ace18…`. [Inferred] Conflict-marker labels differ with how `merge-tree` is invoked; the path-level
  result is the same.
  - **`AGENTS.md`.** [Observed] `tools/agents_merge_check.py` diffs each side against the merge base `d38d7a3c` with
    difflib, independently of git. It applies both edit lists to the base (this PR's first where both insert at base
    line 190) and compares the result with `a5b1d532:AGENTS.md`: `"editsOverlap": false, "bothAppliedEqualsMerge": true,
    "oursAddedBlocksInMerge": [true, true], "theirsAddedBlocksInMerge": [true]`. This PR's side is a replace at base
    lines 183–187 plus an insert at 190; main's side is an insert at 190. `git diff e6afa657 a5b1d532 -- AGENTS.md` is
    exactly main's 9-line Markdown-fences bullet, and `git diff 41932c3b a5b1d532 -- AGENTS.md` is exactly this PR's two
    hunks. Both sides are kept byte for byte. `abc40c9a:AGENTS.md` = `a5b1d532:AGENTS.md` (sha256 `e6af9ed7…` both).
  - **`repair1-typecheck.log`.** [Observed] The sha256 at `41932c3b` (main) is `16ec4cd0…`, and the same at `a5b1d532`
    and `abc40c9a`, so main's bytes are kept. The PR's copy (`f2176292…` at `b329dc9c` and `e6afa657`) returns in
    `abc40c9a` as `utf8-repair1-typecheck.log`, byte-equal (`f2176292…`). The record's `tests.repair1.typecheck` and its
    `files` row name the new path. The only other mentions of the old name are main's own fence record and #533's review
    files, which mean main's log. The two logs differ only in main's trailing `exit=0` line. The resolution is sound.
  - **`project-shape-manifest.ts` across the merge.** [Observed] I re-ran the PR's `comment-only.mjs` (blob
    `b81401601eebc7babd391f0da0be093ec0256ba1`, the same at `2d3f9375`, `41932c3b` and `abc40c9a`) over four ranges. In
    every range the file is emit-equal (emit sha256 `d4b1ba58…`):
    - `a5ab2b28..a5b1d532`: `production files changed 15, comment-only 8, not 7`; source `c32ab4e3…` → `a6401c01…`. My
      output is byte-identical to the committed `comment-only-merged-a5ab2b28-a5b1d532.json` (sha256 `4a767765…` both).
    - `41932c3b..a5b1d532` (this PR over main): `8, comment-only 2, not 6`. The 2 are `canonical-json.ts` and
      `project-shape-manifest.ts`; the 6 are the decoder files.
    - `e6afa657..a5b1d532` (what the merge brought): `7, comment-only 7, not 0`.
    - `a5ab2b28..41932c3b` (main alone): `8, comment-only 7, not 1`. The 1 is `workspace-reach.testkit.ts`, main's
      change.
- **Main has moved.** [Observed] `origin/main` = `973965a8` (#540), one first-parent merge past `41932c3b`, which is its
  ancestor. `git merge-tree --write-tree abc40c9a origin/main` exits 0 (tree `efb625c0…`).
  - Main moved 92 paths since `41932c3b`. 90 are under `docs/`; the other two are
    `apps/three-surface-poc/src/git-observation.ts` and its test.
  - Intersection with the PR's 47 paths: **0** (`comm -12`).
  - In the merged tree, 47 of 47 PR paths keep their `abc40c9a` blob and 92 of 92 main paths keep main's blob. The
    lane's report reproduces.
- **Registry-bound files.** [Observed] Not in either diff. The 47-path list contains neither
  `packages/polaris-dossier/src/git-object-reader.ts` nor `packages/three-surface-poc-core/src/project-shape-observer.ts`.

## 2. Clauses relied on (quoted), and the class ruling

All quotes come from the files at `abc40c9a` (rule 8).

- CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
  - `:18-20` "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the
    agent performing the change never finally decides which classes it touches."
  - `:31-32` "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
  - `:35-36` "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
  - `:37` "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
  - `:40-41` "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
  - `:45-47` "**Class membership is contested by default and is never finally determined by the agent performing the change**"
- GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
  - `:52-55` '"Behavior-preserving" means none of the following changes:' / "a rendered byte, a wire format, a refusal
    string or an exit code;" / "a signed or digest-bound artifact;" / "a consent, security or retention decision."
  - `:62` "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or
    class 4 (security), and class-6 pull requests that remove an endpoint."
  - `:64-66` "an old-versus-new differential over a mutated-record corpus that includes records with altered prose;" /
    "a rule-6 mutant for each predicate;" / "a non-blocking owner notice in the cycle report."
  - `:95-96` "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."
- `AGENTS.md`:
  - `:120` rule 2: "No "zero / all / 100%" claim without running that exact sweep this".
  - `:126-127` rule 6: "Mutate the input and confirm the check fails, per predicate, before trusting it".
  - `:132` rule 9: "A claim of absence needs a sweep with a denominator."
  - `:134-135` rule 11: "An evidence record names its subject and the subject's digest; a record that names neither
    cannot be re-checked against the bytes it describes."
- Test-rigor bar, `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`, read by `git show abc40c9a:<path>`:
  - `:42` "**A test is worth keeping only if some plausible bug makes it fail.**"
  - `:52-54` "1. **Assert behavior, not implementation** — Tests pin observable outcomes (return values, state
    transitions, emitted effects), not internal call sequences. A pure refactor should not break tests; a behavior
    change must."
  - `:60-61` "3. **Edge and failure paths are first-class** — Empty inputs, boundaries, invalid states, error branches,
    and concurrency-sensitive paths get tests"
  - `:64-67` "4. **No tautologies** — A test that mirrors the implementation's logic to compute its expected value, or
    that asserts a mock returned what the mock was told to return, verifies nothing. Expected values are literals or
    independently derived."
  - `:93-94` "10. **Growth is governed** — A test is worth *adding* only if it catches a plausible bug no existing test catches"
  - `:103-104` "apply the mutation thought-experiment: name a one-line bug in the code under test this test would *not*
    catch but should."

**Class ruling (mine).** This round's subject changes one production file, `code-structure.ts` (the code-structure
observer's git runner). The rest of the subject is tests, `AGENTS.md` and evidence.

| Class | This round's delta | The whole PR (over main) |
|---|---|---|
| 1 authority boundaries | No production change; only tests and prose (`authority-artifact-fields.test.ts` retitled) | **Yes** (round 1's ruling stands: the consent, policy and registry readers decode through `decodeUtf8`) |
| 3 deterministic observation | **Yes**: `code-structure.ts`, whose Unknown reason on a fault path is restored | **Yes** |
| 4 security | No production change; the new tests pin the object reader (which feeds the active-content scan) and the seed reader (which feeds `classifyPhaseA`) | **Yes** |
| 6 public interface | No | additive only (`decodeUtf8` in a private package) |
| 2, 5, 7 | No | No |

The PR's own statement (classes 1, 3 and 4, with additive 6) agrees with mine. The three further checks of `:62` apply,
and I find them met for this delta: the decoder differential (section 3); rule-6 mutants for each new predicate, with
two surviving variants named in N1; and the owner notice, which is the coordinator's.

**What a gate accepts or refuses under GP-Q0.**
- [Observed] Over main, the production diff of the PR's 8 production files adds and removes no string literal except
  imports and three `'utf-8'` decoder arguments: `removed-only: ["'utf-8'", "'utf-8'", "'utf-8'"]`, `added-only:
  ["'./decode-utf8.js'", "'@syzygy/support'", "'@syzygy/support'"]`.
- [Observed] The decoder probe at `abc40c9a` matches the base output on all 12,841 rows.
- [Observed] The injected fault now yields the base's reason, and main's `code-structure.ts` is the base's bytes
  (sha256 `ef137daf…` at `a5ab2b28` and `973965a8`).
- [Inferred] No refusal string, Unknown reason, exit code or gate outcome changes against main. The stop clause `:95-96`
  is not triggered.

## 3. What I ran, and the results

Every vitest run used a private TMPDIR under `/tmp/r534b-<n>` and `--testTimeout=60000 --hookTimeout=60000`, one vitest
process at a time. Load averages are recorded beside each run in its kept file.

| Check | Tool / command | Result |
|---|---|---|
| Identity and merges | `git diff`, `git merge-tree`, `tools/agents_merge_check.py`, `comment-only.mjs` | section 1 |
| S1, S2 at round 1's head and at the repair; F2; my mutants | `tools/r2_mutants.py` (`r2-mutants.json`, `r2-mutants-summary.txt`) | table below |
| Probe under X2 and X6 | `tools/probe_mutant.py` (`probe-mutants.json`) | X2: `rowsDiffer 7` (`seed-reader`); X6: `rowsDiffer 8` (`observe-ls-tree`); first differing inputs `bom-bom-text`, `consent+bom-bom`, `instant+bom-bom` |
| Decoder probe at the reviewed commit | `npm run build:poc` at `abc40c9a`, the PR's `utf8-probe.mjs`, `compare-utf8-probe.py` | `rows 12841; corpus 1604 (714 decodable)`; output sha256 `be4bd04594ccd42f0b2e129a1a38c0709f342f0a416fdb803b4f3c1f28cc2667`, equal to the tracked `utf8-probe-output-base.json`; `"rowsCompared": 12841, "rowsDiffer": 0, "missing": 0, "extra": 0` (load 15.56 before and after) |
| F2 fault path at the reviewed commit | round 1's `reorder_fault_probe.mjs` (sha256 `bbb945b8…`) on the `abc40c9a` build | `{"fault":true,"injected":1,"kind":"unknown","reason":"code-structure observation produced a path that is not valid UTF-8"}`; `{"fault":false,"injected":0,"kind":"observed","files":["a.ts"]}`. The fault arm equals round 1's base (`a5ab2b28`) line |
| Committed repair-mutant record | `tools/check_repair_mutants.py` (`repair-mutants-check.json`) | 8 rows; `old` exactly once and `new` zero times at `b81010c8` for 8 of 8; each detector's `killed` agrees with its summary and failure list for 8 of 8; verdict text agrees for 8 of 8 (my first pass showed 6, because the checker left out the `prior` detector named in the C1 and S5 verdicts) |
| N1's figures | `tools/n1_rederive.py` over the two committed aggregates, summing caller rows (`n1-rederive.json`) | repair1: 1,439 calls, 685 same, 754 different (`undefinedValue` 753, `bigint` 1), 52.4 %; round 0: 1,433 / 679 / 754, 52.62 %; alike on every call: `canonicalManifestJson` 299/299, `resourceLimitsDigest` 272/272, `walkthroughEvaluationIdentity` 11/11; the aggregate and compare sha256s equal the record's (`7d7cc323…`, `3e6dd852…`) |
| Where the six extra tap calls come from | `tools/tap_attribution.py`: the PR's tap on the scratch clone, one test file at a time, at `2d3f9375` and `b81010c8` | N3 |
| N4's 20 sites | `tools/strict_sites.py`, my own predicate (`strict-sites-*.json`) | at `b81010c8`: 536 files, 50 constructions in 33 files; at `abc40c9a`: 538 files, 50 in 33; `git grep -n -E` line sets agree; production strict outside the helper **20**, equal, path and line, to the record's `decoder.remainingStrictSites` (`equal to record list: True 20 20`) |
| Digest citers | round 1's `digest_sweep.py`, unmodified (`tools/digest_sweep_r1.py`, same sha256), at populations `b81010c8` and `abc40c9a` | `b81010c8`: 5,125 files, 2 needles cited outside the PR's evidence directory, 0 governed. `abc40c9a`: 5,930 files, 12 needles cited outside it, 1 governed file (N4). Methods agree at both |
| Record `files` table | script over the 31 rows | 0 mismatches of bytes or sha256 at `abc40c9a`; every PR evidence file over main is listed except the record itself |
| Test delta | `vitest list --json` at `2d3f9375`, `b81010c8`, `41932c3b`, `abc40c9a`, by (file, full name) (`test-delta.txt`) | repair: 8 identities only at `b81010c8`, 2 only at `2d3f9375` (the two retitled cases), net +6, which is `+6 ~2 -0`; over main: 41 new, 0 gone, which is `+41 ~0 -0` |
| Typecheck at the reviewed commit | `npx tsc -b --force <build list>`, then `npm run typecheck` | `forced build exit=0`, `typecheck exit=0` (load 21.74 → 22.62) |
| Full suite at the reviewed commit | `npx vitest run` (`full-suite-abc40c9a.log`, `-summary.txt`) | `Test Files  248 passed \| 3 skipped (251)`, `Tests  5476 passed \| 5 skipped (5481)`, exit 0, load 22.63 → 33.11; the 7 PR test files hold 162 tests, all passed; each of the 6 new and 1 retitled-and-rewritten titles passed |
| PR test files on a local merge with current main | `git merge --no-ff origin/main` in the scratch clone (commit `fb282fd7…`, tree `efb625c0…`, equal to the trial merge), 7 files (`merge-main-tests.log`) | `Test Files  7 passed (7)`, `Tests  162 passed (162)`, exit 0, load 29.72 → 30.06 |
| Hosted CI | `gh pr checks 534 -R Tzeusy/syzygy`; `gh api …/actions/runs/<id>` | `checks pass 24m51s` (run 40488445174, governance-docs, `head_sha` `abc40c9a…`, success); `node pass 4m3s` (run 40488445165, node-ci, `head_sha` `abc40c9a…`, success) |
| `check_governance.py` at `abc40c9a` | `python3 scripts/check_governance.py` | `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, exit 0 |
| `check_quotations.py` at `abc40c9a` | `python3 scripts/check_quotations.py` | exit 0; `OK    QC-1  a quotation beside a path:line locator was said by that file — 39 quotations examined in 20 of 974 .md files scanned … 0 findings` |
| Lane battery | read only: `lead/battery-lc64-534r2/SUMMARY.txt` | `commit=abc40c9a9f82a0e94f89e455331b025ed84a7c4c commands=114 nonzero=0`; 114 step logs. Not re-run by me |

**Mutants.** Each row replaces `old` by `new` exactly once (`oldCount` 1 for all 18 runs, file restored after each).
`r2-mutants.json` stores the fragments verbatim, with the commit, detector, counts and every failing test.
- Detector `four` is the four test files the repair touches in three-surface-poc-core: 124 tests at `2d3f9375`, 130 at
  `b81010c8`.
- Detector `core` is every test of `@syzygy/support` and `@syzygy/three-surface-poc-core`: 1,149 at `2d3f9375`, 1,155
  at `b81010c8`.
- Controls on the unmutated commits failed 0: `2d3f9375:core 0 of 1149`, `2d3f9375:four 0 of 124`,
  `b81010c8:four 0 of 130`, `b81010c8:core 0 of 1155`.
- Every failure below is an `AssertionError`; no load timeout co-failed with any mutant.

| Id | At | Mutation | Detector: result |
|---|---|---|---|
| S1 | `2d3f9375` | round 1's S1, byte for byte: the object reader keeps the BOM | core: **survives** (0 of 1,149); four: **survives** (0 of 124) |
| S2 | `2d3f9375` | round 1's S2, byte for byte: the seed reader keeps the BOM | core: **survives** (0 of 1,149); four: **survives** (0 of 124) |
| S1 | `b81010c8` | the same fragment | four: **killed**, 1 of 130, `exact object reads > drops one leading byte-order mark from the decoded text and keeps a second`: `AssertionError: expected { kind: 'text', …(2) } to match object { kind: 'text', text: 'a\n', …(1) }` |
| S2 | `b81010c8` | the same fragment | four: **killed**, 1 of 130, `… > a seed with a leading byte-order mark is read without it`: `AssertionError: expected { kind: 'text', …(2) } to match object { kind: 'text', text: 'a\n' }` |
| F2 | `b81010c8` | round 1's form: `const text = decodeUtf8(withoutGitlinkRecords(bytes)); if (text === undefined) throw new NonUtf8GitOutput(); return text;` over the repaired try | four: **killed**, 1 of 130, `code-structure observer > reports a gitlink filter that cannot allocate its copy as it reports bytes it cannot decode`: `AssertionError: expected { kind: 'unknown', …(1) } to deeply equal { kind: 'unknown', …(1) }` |
| X1 | `b81010c8` | the object reader strips one more BOM (`decodeUtf8(bytes)?.replace(/^﻿/, '')`) | four: **killed** by the same object-reader test: `expected { kind: 'text', text: 'a', …(1) } to match object { kind: 'text', text: '﻿a', …(1) }` |
| X2 | `b81010c8` | the seed reader strips one more BOM (the same `replace`) | four: **survives** (0 of 130); core: **survives** (0 of 1,155); probe: 7 rows (N1) |
| X3 | `b81010c8` | the repaired catch rethrows (`catch (error) { throw error; }`) | four: **killed** by the fault test |
| X4 | `b81010c8` | the repaired catch returns an empty listing (`return '';`) | four: **killed** by the fault test: `expected { kind: 'observed', …(3) } to deeply equal { kind: 'unknown', …(1) }` |
| X5 | `b81010c8` | the seed reader's refusal read record says `outcome: 'refused'` | four: **killed**, 2 of 130 (an existing allowlist test and the new `… refused with its reason and a not-utf-8 read record`) |
| S10 | `b81010c8` | round 1's S10 on the repaired line: the code-structure decode keeps the BOM | four: **killed**, `code-structure observer > drops one leading byte-order mark from git's listing before parsing it` (the fake-git listing): `expected { kind: 'unknown', …(1) } to match object { kind: 'observed', …(1) }` |
| S9 | `b81010c8` | round 1's S9: the git-text decode keeps the BOM | four: **killed**, `… > drops one leading byte-order mark from the tree listing before parsing it`: `AssertionError: expected 'unknown' to be 'observed' // Object.is equality` |
| X6 | `b81010c8` | the git-text decode strips one more BOM | four: **survives** (0 of 130); core: **survives** (0 of 1,155); probe: 8 rows (N1) |
| X7 | `b81010c8` | not a bug: the gitlink filter returns `bytes` when it dropped nothing, skipping the copy | four: fails the fault test (`expected { kind: 'observed', …(3) } to deeply equal { kind: 'unknown', …(1) }`); see section 7 |

## 4. Findings

No blocking finding. Seven notes.

### N1 — note (low). A second byte-order mark is pinned at the object reader only; two site variants survive every committed test

- **Evidence.** [Observed] X2 makes the seed reader strip a second BOM after `decodeUtf8` drops the first
  (`project-shape-observation.ts:433`: `decodeUtf8(bytes)?.replace(/^﻿/, '')`). It passes the four repair files
  (0 of 130) and both projects' tests (0 of 1,155), and dies only to `utf8-probe.mjs`: 7 `seed-reader` rows differ
  (`bom-bom-text`, `consent+bom-bom`, `instant+bom-bom`, …). CI does not run that tool: `git grep -F utf8-probe` over
  `.github`, `PROJECT-STATUS.md`, `scripts` and `package.json` at `abc40c9a` finds 0 files.
  - The object reader's twin, X1, is killed by `git-object-reader.test.ts:292` (`EF BB BF EF BB BF 61` → `'﻿a'`).
    The seed reader's new test (`project-shape-observation.test.ts:673-681`) has the one-BOM case only.
  - X6 does the same at the git-text decode (`:359`) and also survives (0 of 1,155; the probe finds 8 `observe-ls-tree`
    rows). [Inferred] X6 is near-equivalent on real input, since `git ls-tree -r -z -l` output starts with a mode digit.
  - Round 1's F1 fix asked for exactly the one-BOM seed case, so the repair does what was asked. The gap is the half of
    the BOM predicate ("a second is kept") that only the object reader pins.
- **Failure scenario.** Someone "normalizes" BOMs at the seed reader, for example to make a doubled BOM vanish before
  `classifyPhaseA`. The root index then reads differently from what the object reader returns for the same blob, and
  every committed test stays green.
- **Proposed fix.** In `project-shape-observation.test.ts`, extend "a seed with a leading byte-order mark is read without
  it" with `Uint8Array.from([0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf, 0x61])` → `{ kind: 'text', text: '﻿a' }`, as
  `git-object-reader.test.ts:292` does. Either add the same doubled-BOM listing to the tree-listing case in
  `project-shape-git-text.test.ts`, or record X6 as equivalent on real input. Re-run X2 and X6 (fragments in
  `r2-mutants.json`) against the whole suite, and store them in the mutants record.

### N2 — note (low). The round-1 N1 rewording says the lenient encoder "spells" a BigInt; it throws on one

- **Evidence.** [Observed]
  - `apps/three-surface-poc/src/canonical-json-divergence.test.ts:18` says "a merge would make the strict encoder refuse
    what the lenient one spells (an undefined member, a BigInt)". `AGENTS.md:200-201` says "A merge makes one encoder
    refuse what another spells (an `undefined` member, a BigInt)".
  - The same test file pins the opposite at `:148`: `['a BigInt', () => ({ n: 1n }), { error: 'TypeError' }, { error:
    'unsupported-value' }]`, so the lenient encoder throws `TypeError`.
  - The tap agrees. The one BigInt call is `'lenient=TypeError strict=unsupported-value': 1`
    (`buildResponseIdentity`, `canonical-json-tap-aggregate-repair1.json`).
  - The record's `whyNotMerged` is right: "1 a BigInt (both refuse, with different errors)".
- **Failure scenario.** A later merge proposal reads the durable `AGENTS.md` note and briefs the owner that BigInt
  values are spelled today and would start to be refused. They are refused today, so the owner weighs a trade-off that
  does not exist. The real BigInt change is which error a refusal carries.
- **Proposed fix.** Reword both places to the record's reading, for example: "a merge makes the strict encoder refuse
  what the lenient one spells (an `undefined` member), changes the error of what both refuse (a BigInt), or reorders
  array-index keys". The `AGENTS.md` sentence is this PR's own unmerged prose, so it can be edited.

### N3 — note (low). The six extra tap calls come from the new tree-listing test, not the new seed-reader tests

- **Evidence.**
  - `canonical-json-tap-compare-repair1.json`, `explanation`: "[Inferred] they are the two new seed-reader tests of this
    repair in project-shape-observation.test.ts, each of which reaches the three functions once; not traced per test."
    The PR body says the same ("[Inferred] come from this repair's two new seed-reader tests"), and so do the record's
    `roundOneRepair.items` N1 ("before this repair's two new seed-reader tests").
  - [Observed] `tools/tap_attribution.py` ran the PR's tap on one test file at a time, on the scratch clone:
    - `project-shape-observation.test.ts`: `canonicalManifestJson` 32, `observeProjectShapeSources` 32,
      `resourceLimitsDigest` 33 at **both** `2d3f9375` (39 tests) and `b81010c8` (41 tests).
    - `project-shape-git-text.test.ts`: no production lenient call at `2d3f9375` (3 tests); 2, 2 and 2 at `b81010c8`
      (4 tests), all `same`.
  - So the six come from the new "drops one leading byte-order mark from the tree listing before parsing it", which
    observes twice (plain and BOM-led) to completion. The seed-reader tests call `createPhaseASeedReader`, which reaches
    none of the three. The figure (six more calls, all alike) reproduces; only the attribution is wrong, and it was
    labelled Inferred.
- **Failure scenario.** A reader reconciling the two taps trusts the explanation and looks for canonical JSON calls in
  the seed reader that do not exist.
- **Proposed fix.** Replace the explanation in the compare file, the record's N1 item and the PR body with the observed
  attribution, citing this per-file run. Commands and counts are in `rev-534b/tap-attribution.json`.

### N4 — note (low). The digest-citer absence claim was measured before the merges, and is stale at the head

- **Evidence.**
  - The record's `digestCiters.repair1` and the PR body cover "5,089 tracked files at `b81010c8`" and conclude "none
    under `.syzygy/`, `openspec/`, `scripts/` or `.github/`". [Observed] That reproduces at `b81010c8` (5,125 tracked
    files, 5,089 outside the PR's evidence directory; my sweep finds 0 governed hits).
  - At the reviewed head `abc40c9a` (5,930 files), the first merge of main (#487, `d38d7a3c`) has brought in
    `.syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment/compatibility/STATIC-TRACE.json`.
    Its `corpus` carries the base sha256 of `authority-artifact-fields.ts` (64 hex, offset 165216) and its git blob id
    (40 hex, offset 165156).
- **Why it does not block.** [Observed]
  - That trace is pinned to `sourceCommit` `eba011dfbe254c09a88ccc374b3efe5ff5df1762`, and its `scope` says "Every
    tracked JS/TS-family blob at the named Git commit". `eba011df:…/authority-artifact-fields.ts` hashes to the cited
    `01fc9039…`.
  - It is not a row of the package's 11-line manifest. No file under `scripts/` or `.github/` names `STATIC-TRACE`.
    `check_governance.py` reports 0 FAIL at the head.
  - [Inferred] It describes `eba011df`'s bytes, which this PR does not change, and binds nothing at the head.
- **Failure scenario.** A reader takes the PR's "none under `.syzygy/`" as true of the head it merges. The next audit of
  that signed-off package (versioned sign-off v1.0, `ACCEPTANCE-ACT-RECORD.md:1700`) finds a governed citer of an edited
  file that the record said did not exist. This is rule 9's denominator moving under a finished measurement.
- **Proposed fix.** Re-run `digest-citers-stack2.py` at the PR head, or at the head after any further merge, and record
  the one governed citer with the reading above. Or state in the record and the PR body that the sweep precedes both
  merges and name this file.

### N5 — note (low). Rule 11: two logs name neither their commit nor what ran, and the merged-tree checks have no log

- **Evidence.** [Observed]
  - `utf8-repair1-typecheck.log` is npm's banner and nothing else. Its bytes (sha256 `f2176292…`) are also those of round
    1's typecheck logs at `a5ab2b28` and `2d3f9375`, so the log cannot be tied to `b81010c8` by its own content, and it
    holds no exit status. The record's "(npm run typecheck, exit 0)" is the only carrier of both.
  - `repair1-new-tests-5x.log` is five pairs of summary lines (`Test Files  7 passed (7)` / `Tests  162 passed (162)`)
    with no commit and no file list.
  - `canonical-json-tap-aggregate-repair1.json` names no commit, and `canonical-json-tap-compare-repair1.json` names no
    digest of either aggregate it compared. The record carries both (`suiteWideTap.repair1.commit` and the two
    sha256s), so the chain from the record holds.
  - `roundOneRepair.mergeOfMain.secondMerge.checksOnMergedTree` (typecheck, "7 files, 162 tests passed on each of 5
    runs", `check_governance`, `check_quotations` on `a5b1d532`) points at no retained output.
- **Failure scenario.** A later reader holding only a log cannot say which commit it describes. The merged-tree claims
  cannot be re-checked at all.
- **Proposed fix.** Each retained log gets a first line naming its commit and command and a last line with the exit
  status. Retain the merged-tree runs, or label them unretained in the record. The five-run log should name its seven
  files. My own reruns at `abc40c9a` (`typecheck-abc40c9a.log`, `merge-main-tests.log`) give the same results.

### N6 — note (low). The mutant summary lists C1 as "killed by a new test"; only a pre-existing test kills it

- **Evidence.** [Observed] `decoder.mutantsRepairSummary.killedByANewTest` lists all 8 repair mutants, C1 among them. In
  `utf8-repair-mutants-b81010c8.json`, C1's only failing test is `code-structure observer > makes the inventory Unknown
  for a committed path that is not valid UTF-8, never a lossy or colliding path`. That test exists at `2d3f9375`, and C1
  also fails the reviewed head's copies of the four files (`prior` killed). The PR body's "Each is killed by a named
  assertion in the new tests" is true of 7 of the 8. S5 is killed by both the old test and the new fault test.
- **Proposed fix.** Rename the field to `killedByTheTestedCommitsFiles` (what the `new` detector ran), or drop C1 from
  it. Say in the PR body that C1 is pinned by the existing test.

### N7 — note (low). Round 1's N6 is disclosed in the record, not where a reader of the code will see it

- **Evidence.** [Observed] The no-ICU import-time throw is named in the PR body and the record's `residuals[4]`.
  `packages/support/src/decode-utf8.ts` at `abc40c9a` says nothing about ICU (its doc comment covers the BOM and the
  refusal value). Round 1's fix offered "Construct the decoder lazily on first call, or state in the support package's
  header that it requires a Node with ICU". The repair did neither ("no code change").
- **Proposed fix.** Add one comment line to `decode-utf8.ts`, for example "Requires a Node built with ICU: without it the
  constructor throws at import (`ERR_NO_ICU`), which fails closed." Making the construction lazy would change behaviour
  and is out of scope here.

## 5. Every changed output, or the evidence that there is none

- [Observed] **Decoder outcomes:** `utf8-probe.mjs` at `abc40c9a`, built, is byte-identical to the base output (sha256
  `be4bd045…`, 12,841 rows, 0 differ). The round-1 repair changes no decoder site; its one production file is
  `code-structure.ts`. `git diff --name-only 2d3f9375 b81010c8 -- packages apps`, filtered to non-test files, gives
  that path alone.
- [Observed] **Unknown reasons:** the injected allocation fault in `withoutGitlinkRecords` yields "code-structure
  observation produced a path that is not valid UTF-8" at `abc40c9a`, the base's reason (round 1: `a5ab2b28`). Main's
  `code-structure.ts` is byte-equal to `a5ab2b28`'s, and the no-fault arm still observes `a.ts`.
- [Observed] **Refusal strings:** over main, no string literal is added to or removed from the 8 production files except
  imports and decoder arguments (section 2).
- [Observed] **Encoders:** over main, `canonical-json.ts` and `project-shape-manifest.ts` are emit-equal
  (`comment-only-41932c3b-a5b1d532.json`), and the merge left `project-shape-manifest.ts` comment-only.
- [Observed] **Governed and bound bytes:** no `.syzygy/**` or `openspec/**` path is among the PR's 47 over main. The two
  registry-bound files are not among them. The one governed citer of an edited file's old digest is commit-pinned (N4).
- [Inferred] No rendered byte, wire format, exit code, digest-bound artifact or gate decision changes on any input. I did
  not render the surfaces myself. This rests on the probe, the fault probe, the literal sweep, the full suite and hosted
  CI.

## 6. Verdict on each round-1 finding's repair

| Round 1 | Asked (routing) | Repair at `abc40c9a` | Verdict |
|---|---|---|---|
| **F1** | the reviewer's two tests with literal values; S1 and S2 killed at the repaired head against the full suite | `git-object-reader.test.ts:284-293` (`'a\n'`, `'﻿a'`, `outcome: 'read'`) and `project-shape-observation.test.ts:673-681` (`'a\n'`, read record `bytes: 5`). Expected values are literals, and the object ids come from local `node:crypto` helpers (`sha1Blob`), not the module. S1 and S2 survive at `2d3f9375` (0 of 1,149) and die at `b81010c8` by these assertions [Observed]. I did not re-run them against the full suite; the lane's recorded full-suite rows agree (one failure each, the same new test, checked by script in section 3) | **Repaired.** Residual: N1 |
| **F2** | arm (a): filter back inside the converting try; fault arms as a test; reword residual 7 | `code-structure.ts:121-129`. The text is not byte-equal to the base, and cannot be, since the base called the throwing `STRICT_UTF8.decode` and the head calls `decodeUtf8`, which returns `undefined`. The try covers the same two calls, and any throw or `undefined` ends in `NonUtf8GitOutput`, so every path ends as the base's did [Inferred from reading both; Observed for the fault and no-fault arms]. The test `code-structure.test.ts:194-213` fails under F2, X3 and X4. Residual 7 now reads "throws only when `Buffer.concat` cannot allocate the copy" and names the caller's reason | **Repaired** |
| **N1** | reword `whyNotMerged`, `AGENTS.md` and the test comment | figures reproduce (753 / 1 / 754 of 1,439, 52.4 %; three identities alike: 299/299, 272/272, 11/11) | **Repaired**, with N2 (BigInt clause) and N3 (attribution) |
| **N2** | correct the citation; three encoders or a cap1 test | `:21` cites `dc3-decode-and-canonical-json-2026-10-25.json`, which exists; "three"; cap1 named as unpinned | **Repaired** |
| **N3** | pin S4; fix the unfailable rev-parse case; name S9 and S10 | S4 pinned by `:683-690`. The rev-parse case is split from the BOM case. S9 is killed by the listing case, and S10 through a fake `git`. The consent BOM case is retitled to say the mark cannot change the result | **Repaired** |
| **N4** | "the one" → the shared helper; name the 20 | `AGENTS.md:185-190`; the record lists the 20, which reproduce by my predicate | **Repaired** (the follow-up bead is the coordinator's) |
| **N5** | detector scope, tap commit and digest, probe expectation, census commit | all present in the record (`o2.firstRunVerdict`, `testDetectorScope`, `suiteWideTap.repair1`, `repair1Run.expectedProbeOutputSha256`, `census.repair1`) | **Repaired**, with N5 here for the new logs |
| **N6** | lazy construction, or say so in the package header | disclosed in the PR body and record only | **Partly**: N7 |
| **N7** | merge main after #533; hand-resolve `AGENTS.md`; re-run `comment-only.mjs`; fix the body | both merges verified (section 1), `AGENTS.md` keeps both sides, the merged file is comment-only, the body is corrected | **Repaired** |
| **N8** | match 8-hex prefixes; add the raw | 75 needles; `R-LIVE-TEST-NO-SPAWN-1-RAW.md` found | **Repaired** at `b81010c8`; stale at the head (N4) |

## 7. Test quality

- **The F1 tests.** The expected values are literal text, outcome and byte count, typed from the UTF-8 BOM rule (bar 4,
  `:64-67`). They kill S1, S2 and X1. They do not kill X2: the seed case has no doubled BOM (N1).
- **The seed refusal test** (`project-shape-observation.test.ts:683-690`). It pins `{ kind: 'unavailable', reason: 'seed
  is not valid UTF-8' }` and the `not-utf-8` read record, both literals, and kills S4 (lane) and X5 (mine). This is the
  refusal-string pin GP-Q0 `:53` protects.
- **The tree-listing test** (`project-shape-git-text.test.ts:54-63`). It kills S9 through a literal (`toBe('observed')`).
  Its `toEqual(plain.result)` is a metamorphic check (the same module on the BOM-free input), not an independently
  derived value. It adds strength beside the literal rather than replacing one, so bar 4 holds.
- **The fake-git cases** (`code-structure.test.ts:174-213`; the helper starts at `:175`). They are the only route to S10 and to the default runner's
  fault arm, and both kill as intended. Two things to know:
  - They need `/bin/sh` and an executable TMPDIR (a `noexec` TMPDIR would make the fake `git` unrunnable, and the cases
    would fail as "unreadable").
  - The fault case is bound to `Buffer.concat` being the filter's copy. X7, a refactor that skips the copy when nothing
    is dropped, fails it. That is not a pure refactor in bar 1's sense (`:52-54`): it removes the only fault arm. The
    test's comment says so ("The filter's only way to throw is a failed Buffer.concat"). Whoever removes the copy should
    retire this case with it, not "fix" it. `vi.spyOn(Buffer, 'concat')` mocks a runtime boundary, not the module's
    internals (bar 5).
- **Determinism (bar 6).** The full suite, the merged-tree run and every mutant control passed, with no retry or flaky
  marker in the changed files. I ran the new files once per detector, not five times. The lane's five-run log
  (`162 passed` ×5) has no commit (N5).
- **Net delta (bar 10, `:93-94`).** Repair `+6 ~2 -0`; whole PR over main `+41 ~0 -0`, both reproduced by test identity.
  Each repair addition kills a mutant no earlier test killed: S1, S2, S4, S9, S10 and F2 all pass the reviewed head's
  copies of the four files (S1 and S2 measured here; S4, S9 and S10 by round 1 against the full suite).
- **Missing pins (workflow `:101-102`).** The doubled-BOM case at the seed reader and the git-text decode (N1). Nothing
  else this repair adds or alters goes unpinned.

## 8. Cleanup

[Observed] Deleted: the scratch clone `rev-534b/clone` (with its local merge commit `fb282fd7…`, reachable from no ref
outside it), my TMPDIRs `/tmp/r534b-1` to `/tmp/r534b-7` (nothing else in `/tmp`; `ls /tmp | grep -c r534b` → 0), and
four transient copies I no longer need: the four `vitest list` outputs (about 2 MB each; `test-delta.txt` keeps their
result), copies of the record and of `STATIC-TRACE.json` (both readable from git at `abc40c9a`), and the two diff halves
(`r2-review.diff` is their concatenation). No checkout or worktree under `/home/tze/GitHub/syzygy` was edited. Nothing
was pushed, commented or merged, and no `bd` mutation ran. No kept file is over 300 KB (`find -size +300k`: none). Paths
inside result files name the deleted clone. To re-run a tool: clone at the commit it names, `npm ci`, build where the
tool says, and pass the clone path. `tools/digest_sweep_r1.py` is round 1's `digest_sweep.py`, unmodified.

Kept, 43 files, relative to `rev-534b/` (this raw excluded):

| File | sha256 |
|---|---|
| `agents-merge-check.json` | `cdcb14b5bfaf3b7e9e6403fe98b487a03d84d51268bf73f4b411c4fb6575c272` |
| `build-abc40c9a.log` | `ff04021c063a8dd33d96a8b56213397750f5dd8560c5b2c658a5f815184c9ef2` |
| `check-governance-abc40c9a.log` | `e7869b074406c3900a57b2f38cf1dcf2540aa1ce0dbdcce674dc4643e8f00bdb` |
| `check-quotations-abc40c9a.log` | `0860c7cbbe1329deabd8450efad5b328d2176747cbfd4f7be3b76f505dfae5bf` |
| `comment-only-41932c3b-a5b1d532.json` | `cde6b7ce14bd15a09bfbb1316b367e8b2880e0f89696dc31507c97c29390872d` |
| `comment-only-a5ab2b28-41932c3b.json` | `cd645310deb6e8f1b73974062d50faa65bc3117815acc8d17e0968df487066f4` |
| `comment-only-a5ab2b28-a5b1d532.json` | `4a767765d9cfa609718e79eedb9eb00eb6fd093aba460679c1b4e22db495a1c1` |
| `comment-only-e6afa657-a5b1d532.json` | `2e771b806e51cfd21ad4771224c644dcaecc631aba65747351165fbc9f33a211` |
| `digest-sweep-abc40c9a.json` | `3dd23de9865050f2316692fe6dffa957e1b96b6d0a222be4e37d5c275a729c19` |
| `digest-sweep-b81010c8.json` | `6d5c4b97f7fc95564bdb453a7cedca5b4aeddf34bfafc774e0ed0521a1949eae` |
| `full-suite-abc40c9a-summary.txt` | `8f6cc5b333b7d6b5e3dd40af5c5e70a752c378b9910490ea5b629265b768a037` |
| `full-suite-abc40c9a.log` | `6f9cfd3c96dd9b5be02c67eb4d3eda9206a891776a2b4588d85871d1f0ba6be3` |
| `main-moved-paths.txt` | `718e8b96051465e8bdbdb9f110448c19fe19de1a28f791236807d568bdb2c4df` |
| `merge-main-tests.log` | `7e2b5b15c76a8e26008395253c40ed4c1e7122dbf9e36d243add451fa2334e13` |
| `n1-rederive.json` | `03ad6ddd62557be771f9dd561e86f5103c5cd051dbd3c604caff42f105306349` |
| `npm-ci.log` | `b6640843f1adc9157410536aed53695255a92226d17e56daba188c8d3e39b40f` |
| `pr-body.txt` | `59b0002518c139840b732b5c553fb6b009570c1d6698b4a0beaf93b942c170dd` |
| `pr-paths.txt` | `47972285b5ae3101a5a521b3b940e94d20856bbb2c66f9ee31c9a0e1e926939c` |
| `probe-abc40c9a.loadavg` | `1b286a6b0167986a0ea45e49c3bfaba2bb5021a745662f9d6d36b3b7fd3ef061` |
| `probe-abc40c9a.log` | `e8131fc377a4a6faf0ab21350f254f85cd50ccbe5bee8180fc26ef2b7dfb26ce` |
| `probe-compare-abc40c9a.txt` | `0939b3d643ad54a5451b3ec54825013a697e874008c67f751891a155a71a9d22` |
| `probe-mutants.json` | `09d28ccb6a69e6b50abbf909bc5bf1509dda949941d73988134736641511c54f` |
| `probe-mutants.log` | `18a253affc0caa8b586fdd4d07e1977a247e1c1a6553abf3f0e0c3d799158bad` |
| `r2-mutants-summary.txt` | `e1cf7ec40afc3b8e6145a51da7d2a68bed3fe4fbeeace4721dd7f07d2ba8f20a` |
| `r2-mutants.json` | `46ec151ebb2298c7028873877119be5ac0acada0bcae5b9ac0f555118bd6d630` |
| `r2-mutants.log` | `664f9ec435e992ae2a4846f7466814ff0b4f879ee227709a1a2e90082ee1a4fa` |
| `r2-review.diff` | `b73519daf1dbf9b2902bb0a359e70ea6560f49a374b71475aeb3404630b98ab2` |
| `reorder-fault-probe-abc40c9a.txt` | `864ee11a4f63ad3e8762186e0ae11a01db9532de9f1e23d33c6661d9111cdc13` |
| `repair-mutants-check.json` | `048d4eefe92870798d2d7cef0a4786b48a2583557cc4c5e21621bef18674de21` |
| `strict-sites-abc40c9a.json` | `2e8f0ac379b83d04253ea4da0d387a4b7fd9f1301f924484bc85ea8d128c349d` |
| `strict-sites-b81010c8.json` | `01989a9902f02076f16427e4d9228b7b3efa99ef69d04e89f4bc6f8a52d444cc` |
| `tap-attribution.json` | `538a3c69f2ffd97fb3b7922811773d01157064620981e1e0547082a385e44903` |
| `tap-attribution.log` | `b48382bd47bd13560b88e34085f14344502267f9d2526492700602e0f00bfc5b` |
| `test-delta.txt` | `d188323841fa21507a4ebcb4ad5ca83edbbcb2607b440aee8c67afba3ee52409` |
| `tools/agents_merge_check.py` | `5ae4166c71035c3545ad6138f52564b8fb63bf2d0d375ea6e36984914c56e94c` |
| `tools/check_repair_mutants.py` | `d0bb54e8a81cec9204f33875d81fafbc78463f136eba6693c817efc9dd0c7bf4` |
| `tools/digest_sweep_r1.py` | `359332229f0e589d904ea56171379c776a3955ab6cbdded79cf50531e4a522c9` |
| `tools/n1_rederive.py` | `d9cdd4aab4678230c697955c65a8bb2e1e1e5d17d89310a772e256fafd8e314d` |
| `tools/probe_mutant.py` | `bf97bdd4b0ea365fa5efc5c377348bbdad7669c0c696a03336e106c2be72ed15` |
| `tools/r2_mutants.py` | `1b0df9f9234d7e792fc493b91ff461d85cc9101f59eb352c5b5366481416a6c2` |
| `tools/strict_sites.py` | `67905820aba39fca7221e5ccce02ff2d2b5b560ae98e6ad00e18ee773f629852` |
| `tools/tap_attribution.py` | `f28d3bf315a52a8a30bead3ea1f069b8d06ffce7af336097ddd9ad19e423b7d8` |
| `typecheck-abc40c9a.log` | `917d1a63f63a9db3e486884646e23bc6fefabbd22af622e857ef0ecc882e8bfb` |
