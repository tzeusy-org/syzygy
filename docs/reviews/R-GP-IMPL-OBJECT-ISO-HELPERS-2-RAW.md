# R-GP-IMPL-OBJECT-ISO-HELPERS-2 — CC-REV-1 implementation review of syzygy-bpyt.6.3 stack 4, round 2
Verdict: REVISE
Reviewed commit: 4d92ac95
Subject: r2-review.diff sha256 0d49d66fc329f9f938350c019b755ec8bf28ca361250f79dbc3a9dbd465df07c

Reviewer: rev-548-r2, a fresh-context agent. I did not write the change, its round-1 repairs or the round-1 review. Brief:
`scratchpad/lead/b63iso/brief-r2.md`. Reviewed 2026-10-28. PR #548, branch `agent/syzygy-bpyt.6.3-iso`, head
`4d92ac9518dd60cdd124525c3e36c086ccd5e425`.

Verdict in one paragraph. [Observed] The repair and the merge change no production behaviour. The only production byte
changed after `2e7ab2ec` is a comment in `is-record.ts`, and its emit is identical. The merge's remerge diff is empty.
`site-equivalence.mjs` is the reviewer's strict file plus exactly the five-line SM4 case. Its selftest, its four rule-6
rows and its pair output all reproduce byte for byte. The N3 row kills O8 alone. Each of the five allow-list names is
needed, and every #545 pin I replayed is still refused. The full suite passes at the head (5,674 passed, 0 failed), and
hosted `checks` and `node` pass on the head. The verdict is REVISE for one blocking finding, F1. The reason given for
dropping the `true` row from `authority-artifact-fields.test.ts` is false, in the test comment and in the PR body. A
predicate that names two types (`string`, `number`) and admits a boolean survives at three class-1 calls once the row is
gone, and that row alone killed it. Notes N1 to N4 do not block.

## 1. Subject identity checks

All of these were re-derived by script in my own clone (`git clone /home/tze/GitHub/syzygy`, then fetched
`agent/syzygy-bpyt.6.3-iso` and `main` from GitHub).

| Check | Result |
|---|---|
| `sha256sum r2-review.diff` | `0d49d66fc329f9f938350c019b755ec8bf28ca361250f79dbc3a9dbd465df07c`, matches the brief [Observed] |
| The three commands, in order, each output preceded by its `### <command>` header | `0d49d66fc329f9f938350c019b755ec8bf28ca361250f79dbc3a9dbd465df07c`, **matches** [Observed] |
| Part 2, `git show --remerge-diff --format=%H d6242fb0` | Prints only `d6242fb03b9f9f81ee95133f43fd84461da85ab4`, so the remerge diff is empty, as the lane reports [Observed] |
| Branch tip on GitHub, and `headRefOid` | `4d92ac9518dd60cdd124525c3e36c086ccd5e425` both, `updatedAt` 2026-10-28T04:15:22Z [Observed] |
| PR body, `gh pr view 548 --json body --jq .body \| sha256sum` | `d5d0fe45132e3db08d797e9a0f269b7cdebdb2416f130fad12c48759c795ac26`, **matches** the frozen body [Observed] |
| Commits `2e7ab2ec..4d92ac95`, first parent | `28024ade` → `945c13f9` → `d6242fb0` (merge, parents `945c13f9` and `a1b9bde2`) → `2f33f137` → `2d9039bb` → `4d92ac95`, as the brief states [Observed] |
| Round-1 raw | sha256 `157563c5e445b201d56c49ead8685d4dd0fbec3c2a80a1b215e358f5fcff56df`, matches [Observed] |
| Reviewer strict tool `rev-548/tools/site-equivalence-strict.mjs` | sha256 `fbcee6fc821dfb35f7461f0fa5cbab4eb7e828d9eef1d866cd48b8db51adb942`, matches [Observed] |
| Main moved | `gh/main` is `1a8864d94f825fb7abff04f61a4588f325e2b098`, 5 commits past `a1b9bde2` (PR #550), 28 paths. 0 of them are among the PR's 67 paths against `a1b9bde2`. 2 are under `packages/` or `apps/`: `apps/three-surface-poc/src/polaris-generation/generation-mutation.ts` and its test. Neither is imported by, nor imports, a PR file [Observed: the 28 paths are kept in `main-moved-paths.txt`; the import lines were read] |

## 2. Clauses relied on, and the class ruling

**CC-REV-1** is in `.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at `4d92ac95`:
- :18-20: "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- :31-32: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- :35-36: "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
- :37: "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- :40-41: "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
- :45-47: "**Class membership is contested by default and is never finally determined by the agent performing the change**"
- :49-50: "**The change record states** which classes the change touches, or "none," so a misclassification is a findable
  violation after the fact."
- :57-58: "Per the canonical bar, if the reviewer authors semantic fixes, the exact resulting head gets fresh independent review."

**GP-Q0** is in `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md` at `4d92ac95`:
- :52-55: "“Behavior-preserving” means none of the following changes:", then "a rendered byte, a wire format, a refusal
  string or an exit code;", "a signed or digest-bound artifact;" and "a consent, security or retention decision."
- :62-66: for "pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security)", the checks are "an old-versus-new differential over a mutated-record corpus that includes records with
  altered prose;", "a rule-6 mutant for each predicate;" and "a non-blocking owner notice in the cycle report."
- :95-96, the stop clause: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**Test rigor** is in `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`, read with `git show 4d92ac95:`:
- :42: "**A test is worth keeping only if some plausible bug makes it fail.**"
- :93-96, bar 10: "A test is worth *adding* only if it catches a plausible bug no existing test catches … Reviews state the net
  test delta;"

**Engineering bar** is in `.claude/skills/th-engineering/subskills/engineering-bar/SKILL.md`, read with `git show 4d92ac95:`:
- :84-87, bias 8: "Re-check important changes before merge rather than assuming the first pass sufficed. Evidence (command output,
  test runs, rendered artifacts) beats assertion."

**AGENTS.md** at `4d92ac95`: rule 6, "Mutate the input and confirm the check fails, per predicate, before trusting it";
rule 10, "Freeze the bytes a review is bound to; any later edit retires the review."

**Class ruling** (mine). Round 1's ruling stands: classes 1, 3 and 4 are touched, class 6 is over-inclusive, and 2, 5 and
7 are not touched. The repair does not change that class. One addition: commit `2f33f137` edits
`packages/support/src/support-purity.test.ts`. That test is the egress and purity guard on the leaf that every class-1 and
class-4 importer inherits, so the edit is class-4 work ("egress paths"). The PR body states it ("After #545 merged",
item 2) and the coordinator directed it. It is reviewed in section 3, runs 9 and 10.

**GP-Q0.**
- [Observed] Nothing a runtime gate accepts or refuses changes (section 5), so the stop clause is not triggered.
- [Observed] Two test-side acceptances do change, and both are declared:
  - The purity test now accepts the five names (PR body, "After #545 merged", item 2; the coordinator's direction).
  - The `true` row is removed (PR body, the N8 bullet; repair list item 7 lets the lane drop it).
- F1 is about the reason given for the second, not about a gate.
- The three extra checks were assessed in round 1, and the repair does not reduce them. The rule-6 mutants are re-run at
  the repair commit: S 9/9, I 5/5, C 52/60 (`mutants-*.json`, commit `28024ade`).

## 3. What I ran and the results

Every suite ran under a private TMPDIR (`/tmp/r548b-1` … `/tmp/r548b-8`, all now deleted), one vitest at a time.
`/proc/loadavg` was read before every run; the values are quoted here or stored per row in the kept JSON.

| # | Run | Result |
|---|---|---|
| 1 | Identity checks | All match (section 1) [Observed] |
| 2 | `npm ci`, then `npm run typecheck` at `4d92ac95` (load 22.76) | `added 117 packages`; typecheck `exit 0` [Observed] |
| 3 | `git show <c>:docs/evidence/syzygy-bpyt-6-3-iso/site-equivalence.mjs \| sha256sum` | `fbcee6fc…adb942` at `28024ade`, `945c13f9`, `d6242fb0` and `2f33f137`; `121a3d57cfc8eb5375858b80ba1ec84fdf2d62ee8098979253d12fd37809ac00` at `2d9039bb` and `4d92ac95`. `git diff --numstat 945c13f9 4d92ac95 --` the tool gives `5	0`; the five lines are :84-88 (the comment, `ibase`, `ihead` and the two cases) [Observed] |
| 4 | `node site-equivalence.mjs --selftest` at head (load 23.22) | `site-equivalence selftest ok`, exit 0, equal to `site-equivalence-selftest-output.txt` [Observed] |
| 5 | The lane's `site-equivalence-mutants.mjs` at head on the pair `81862261 22142d9f` (load 22.88) | `{"mutants":4,"killed":4,"killedBySelftest":["SM1-rename-guard-removed","SM2-blank-line-filter-restored","SM3-definition-removed-without-its-line-end","SM4-iso-import-removed-without-its-line-end"],"survivedSelftest":[],"controlsClean":true}`. Every row equals the committed `site-equivalence-mutants.json` except `ranAt` (mine is `4d92ac95`, theirs `2d9039bb`; the tool bytes are the same) [Observed] |
| 6 | `tools/own-se-mutants.mjs`: five mutants of my own against the SM4 cases, each also run on the pair (load 32.12) | R2-M1 (the isoOf import never removed) KILLED, pair 12 equal. R2-M2 (isoOf dropped from `DEFINITIONS`) KILLED, pair 12. R2-M3 (every isoOf call's argument erased on both sides) KILLED by the second new case only, pair 19. **R2-M4** (the import regex without its `m` flag) **SURVIVED** the selftest, pair 12. **R2-M5** (the isoOf import removed from any module) **SURVIVED** the selftest, pair 19 (N1) [Observed] |
| 7 | `site-equivalence.mjs` regenerated at `81862261..22142d9f` (load 30.57) | `modified 20, equal 19`, `notEqual` = `iso-of.ts`, `support/src/index.ts`, `support/src/is-record.ts`; `cmp` with the committed `site-equivalence.json`: **byte-identical** (sha256 `7864c27f…7726`) [Observed] |
| 8 | `build-record.py` in a copy of the evidence directory, with the record's own nine arguments | `wrote … sha256 061f9e66307e88b74e127c78a5e5ffeebf9424e9b1e756b18f865beeead7092a`, exit 0; `cmp` with the committed record: **byte-identical**. With the allow-list and SM4 arguments swapped it refuses with four problems, including `the allow-list and SM4 commits are not the two commits after the merge, in that order`, exit 1 [Observed] |
| 9 | `tools/r2-mutants.py`, N3 rows (loads in the JSON) | `N3-control-head` 0/38 failed. `N3-O8-at-head` 1/38 failed, exactly `readSecretRedaction refuses what it does not implement refuses a declaration that is a function that carries every field`. `N3-O8-without-the-function-row` 0/37, so it survives. The new row alone kills O8 [Observed] |
| 10 | `tools/r2-mutants.py`, allow-list rows | `AL-control-head` 0/33. Each removal fails only `names no identifier outside its literal list in any source`, with exactly: `[ 'is-record.ts: Array' ]`, `[ 'is-record.ts: Readonly' ]`, `[ 'is-record.ts: Record' ]`, `[ 'is-record.ts: isArray' ]`, and `[ 'index.ts: isRecord', …(1) ]` for `isRecord`. Eight #545 pins replayed at head: RP2, RP5, RP7, RP16, Y1, Y2 (`[ 'sha256.ts: eval' ]`), Y4 (`[ 'sha256.ts: Function' ]`) and Y13. All 8 are still killed by that test. Three of my own, using the new names (`Array.isArray.constructor(…)`, `Array.from([globalThis])`, a `Readonly<Record<…>>` alias), are killed too [Observed] |
| 11 | `tools/bool-mutant.py`: mutant F, `(x !== null && typeof x !== 'string' && typeof x !== 'number' && !Array.isArray(x))`, at authority-artifact-fields.ts:102, 121 and 132 (load 20.91) | Against the test file at head: **SURVIVED** at all 3 (0/27). Against the test file at `2e7ab2ec` (with the `true` row), same production bytes (asserted): KILLED at each, 1/32. The one failure each time is the `true` row: `refuse a policy document that is true`, `refuse a registry document that is true`, `surface a first registry entry that is true as the malformed entries list` (F1) [Observed] |
| 12 | Head test files on base code: a worktree at `81862261` plus the six existing test files from `4d92ac95` | 486 tests, 485 passed, 1 failed: `no route and no credential sweeps a non-empty population of source files`. This equals `test-runs-summary.json` and the PR body [Observed] |
| 13 | The eight PR test files at head | 546 of 546 passed, equal to the record and the Tests line [Observed] |
| 14 | **Full vitest suite** at `4d92ac95`, `npx vitest run` (load at start 25.70) | `success: True`, 256 files (253 run, 3 `*.live.test.ts` all-skipped), 5,679 tests, **5,674 passed, 0 failed, 5 pending**, exit 0. No file failed, so nothing was re-run alone [Observed] |
| 15 | Hosted, `gh pr checks 548` | `checks	pass	24m47s` (run 40624959994) and `node	pass	4m32s` (run 40624959992); `gh run view` gives `headSha` `4d92ac9518dd60cdd124525c3e36c086ccd5e425` for both, event `pull_request` [Observed] |
| 16 | `python3 scripts/check_governance.py` (load 33.60) | `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted` [Observed] |
| 17 | `python3 scripts/check_quotations.py` | `OK    QC-1  … 40 quotations examined in 21 of 990 .md files scanned … 0 findings` [Observed] |
| 18 | Surface-version values, `git grep -l -F` and a Python byte scan over every tracked file at `4d92ac95` | 7,373 tracked files; both methods find `b3384e7662f1` / `64c4c7a6ef72` in exactly `build-record.py` and `dc4-object-and-iso-helpers-2026-10-28.json`, both inside the PR's evidence directory. `git grep` gives the same two at `945c13f9`, over 6,855 tracked files [Observed] |
| 19 | The lane's `digest-citers.py` re-run as `2e7ab2ec 28024ade 28024ade --also AGENTS.md` | `edited 5 files, 40 needles, 6820 files scanned, cited 0, methods agree True`. Equal to `digest-citers-repair.json` except that the three commit fields hold the short ids I passed [Observed] |
| 20 | Production bytes | `git diff --name-only 2e7ab2ec 945c13f9 -- packages apps`, tests excluded: `packages/support/src/is-record.ts` only. `d6242fb0 4d92ac95`: none. Against `a1b9bde2`, the head changes 22 production files, the same 22 as `81862261..2e7ab2ec`. Of those, `2e7ab2ec..4d92ac95` changes only `is-record.ts` [Observed] |
| 21 | `is-record.ts` at `2e7ab2ec` and at head through `ts.transpileModule` (`removeComments`) | `emit equal true` [Observed] |
| 22 | Named copies after the merge, `git grep -E "(const\|function) (isObj\|isObject\|isRecord\|isoOf\|isPlainObject)\b"` over `packages apps scripts` | The same 10 lines at `22142d9f` and `4d92ac95`, so main added no copy [Observed] |
| 23 | Local merge of `gh/main` `1a8864d9` into `4d92ac95` (local `307da249`, clean) | `npm run typecheck` exit 0 (load 39.46). 10 test files, 592 of 592 passed (load 30.45): the PR's 8, `support-purity.test.ts`, and main's changed `generation-mutation.test.ts` [Observed] |
| 24 | Fix A of F1, applied in my clone and reverted | `authority-artifact-fields.test.ts` 32 of 32 passed at head [Observed] |
| 25 | N1's three-line fix, in a scratch copy beside the tool and deleted afterwards | Unmutated: `site-equivalence selftest ok`, and the pair output is byte-identical to `site-equivalence.json`. R2-M4 is killed by the second added case and R2-M5 by the first [Observed] |

Not run by me: the canonical battery (`battery_clone.py`). The PR body reports `commands=114 nonzero=0` at `4d92ac95`
[Unknown to me; not re-run]. Under rule 7 that figure is valid only for the commit it names.

Conduct. I opened nothing under `~/.claude/`, `~/.config/` or any token store, and read no Butlers or other
observed-repository content. The harness saved one oversized tool output (a `git diff --stat` of the merge range) under
`~/.claude/projects/…/tool-results/`. I did not open it, and re-ran the narrower command instead. I read no other
reviewer's scratch directory. The #545 pins in run 10 were taken from tracked repository files under
`docs/evidence/support-leaf-guards-review-2026-10-28/r1/`.

## 4. Findings

### F1 — blocking, low: the reason given for dropping the `true` row is false, and the row was the only pin of a class-1 weakening

**Evidence.**
- [Observed] `packages/three-surface-poc-core/src/authority-artifact-fields.test.ts:68-69` at `4d92ac95`:
  "// `a number` is not redundant with `a string`: a test written as `typeof value !== 'string'` refuses the string and
  admits the number. There is no" / "// row for `true`: a test that refuses a string and a number yet admits a boolean has
  to name three types."
- [Observed] The same reason is in the PR body (N8 bullet): "a mutant that admits only booleans was not written, because a
  test that refuses a string and a number yet admits a boolean has to name three types [Inferred]". It is also in the
  record (`dc4-object-and-iso-helpers-2026-10-28.json:812`, generated from `build-record.py:393`): "[Inferred: a test that
  refuses a string and a number yet admits a boolean has to name three types]".
- [Observed] The comment counts by its own convention. It calls the `a number` mutant "a test written as
  `typeof value !== 'string'`", which names one type. By that count, the boolean analogue is
  `typeof value !== 'string' && typeof value !== 'number'`, which names two. Run 11 is that predicate (F), with the same
  null and array clauses as the lane's mutant E. At head it survives at authority-artifact-fields.ts:102 (policy document),
  121 (registry document) and 132 (first registry entry). The dropped row kills it at each, alone (1/32 each time).
- [Inferred] Under the other count, where the array check is a type too, F names three types and E names two. The step
  from E to F is then one more named type in both counts. So "has to name three types" does not separate a plausible bug
  from an implausible one, and the comment's own convention makes it false.
- These three calls decide PWB-REQ-005's "type- or shape-invalid" population for the policy and registry artifacts. That
  is class 1, as round 1 ruled.

**Why this blocks.** The brief's verdict rule makes a false sentence in the PR body or a changed doc blocking. Test rigor
:42 asks whether "some plausible bug makes it fail". F is as plausible as E, the lane's own justification for keeping
`a number`: both are deny-lists of primitives that leave some out. Repair list item 7 allowed the row to be dropped, but
only with a true reason.

**Failure scenario.** [Inferred] A later edit replaces `isRecord(json.value)` at authority-artifact-fields.ts:102 with
a hand-written deny-list that forgets booleans. A policy document that is `true` is then read as an object and no longer
refused as `undecodable`. No test fails. The test comment tells the next reader that this bug is not worth a row.

**Exact fix: Fix A, recommended (restore the row).**
- Replace authority-artifact-fields.test.ts:68-70 with these three lines, verbatim:
  ```
  // `a number` is not redundant with `a string`: a test written as `typeof value !== 'string'` refuses the string and admits the number. `true` is
  // not redundant with `a number`: a test written as `typeof value !== 'string' && typeof value !== 'number'` refuses both and admits a boolean.
  const NOT_OBJECTS: ReadonlyArray<readonly [string, unknown]> = [['an array', []], ['null', null], ['a string', 'x'], ['a number', 1], ['true', true]];
  ```
  The file then passes 32 of 32 at head (run 24).
- PR body, replace the whole N8 bullet with: "- N8, chosen: the `a number` row stays in both `NOT_OBJECTS` tables and the
  `true` row stays in `authority-artifact-fields.test.ts`, each with a comment naming the bug it catches that the row
  before it misses (a `typeof value !== 'string'` test; a `typeof value !== 'string' && typeof value !== 'number'` test).
  Round 2 of the review ran the second as mutant F at authority-artifact-fields.ts:102, 121 and 132: without the `true`
  row it survives at all three, and the `true` row alone kills it at each. Net of the repair: one test added."
- In `build-record.py:393` (and so the record), replace the text from "None of the mutants run" to the end of the
  `reading` with: "None of the lane's mutants (A, B and D admit true and a number alike, E admits both) separates a true
  row from the a-number row; round 2 of the review's mutant F, which names string and number and admits a boolean,
  survives at 102, 121 and 132 without the true row and is killed by it alone, so the true row stays."
- Re-measure `test-delta.json` and `test-runs-summary.json`; the eight files then hold 551 tests. Rebuild the record.
- Restate the Tests line from the re-measured figures. The expected form is "+137 ~1 -0 … 414 → 551 passing; round 1's
  repair adds the function row, 136 + 1". State the post-repair full-suite figure as re-run.

**Exact fix: Fix B (keep the row dropped, correct the reason).**
- Replace authority-artifact-fields.test.ts:68-69 with:
  ```
  // `a number` is not redundant with `a string`: a test written as `typeof value !== 'string'` refuses the string and admits the number. There is no
  // row for `true`: a test written as `typeof value !== 'string' && typeof value !== 'number'` refuses both and admits a boolean, and no row here catches it.
  ```
- PR body, replace from "a mutant that admits only booleans was not written" to the end of that sentence with: "round 2
  of the review ran a mutant that names `string` and `number` and admits a boolean (F) at authority-artifact-fields.ts:102,
  121 and 132; it survives at all three, so dropping the row leaves it unpinned at three class-1 calls".
- In `build-record.py:393`, replace "a mutant that admits only booleans was not written [Inferred: a test that refuses a
  string and a number yet admits a boolean has to name three types]" with "round 2 of the review's mutant F (names string
  and number, admits a boolean) survives at 102, 121 and 132 without the row [Observed by R-GP-IMPL-OBJECT-ISO-HELPERS-2]".
  Then rebuild the record.

Either fix clears F1. Under Fix B a known non-equivalent survivor stays at a class-1 call, which test rigor :42 counts
against it; that is why I recommend Fix A.

### Notes (non-blocking)

**N1, low: the SM4 cases put the `isoOf` import on the first line, from `./iso-of.js` only.**
- [Observed] Two of my mutants survive the new selftest (run 6).
  - R2-M4 drops the regex's `m` flag, so the import is removed only when it is the file's first line. It is visible only
    on the pair (19 equal becomes 12).
  - R2-M5 removes an `isoOf` import from any module. It is invisible on both the selftest and the pair. A head that took
    `isoOf` from another module would then compare equal.
- The support import already has the matching case: "a different import source is not equal" (:74).
- Fix: add these three lines before `console.log('site-equivalence selftest ok');`. They are kept verbatim as
  `tools/sm4-fix-lines.txt`. Run 25 shows the unmutated tool still ok and its pair output unchanged, with R2-M4 and R2-M5
  each killed.
  ```
    // the isoOf import is removed only from its own module, and wherever it stands among the imports
    if (compareFiles(ibase, ihead.replace("'./iso-of.js'", "'./elsewhere.js'"), 'x.ts').equal !== false) throw new Error('selftest: an isoOf imported from another module is not equal');
    if (compareFiles(`${base}${ibase}`, `${head.replace("from '@syzygy/support';\n", "from '@syzygy/support';\nimport { isoOf } from './iso-of.js';\n")}export const g = (n: number) => isoOf(n);\n`, 'x.ts').equal !== true) throw new Error('selftest: an isoOf import after another import is equal');
  ```
- `build-record.py`'s five-line check would then need eight lines. The tool would also differ from the round-2 bytes,
  which CC-REV-1 :57-58 sends back for review. So this belongs in a follow-up bead, not in this PR.

**N2, low: the AGENTS.md support note calls `isRecord` "the one plain-object test".**
- [Observed] AGENTS.md:184-187 at head: "the one `sha256`, the one `deepFreeze`, a shared strict `decodeUtf8` and the one
  plain-object test `isRecord`". These are round 1's N5 words, copied as directed.
- [Observed] Two things make the wording inaccurate:
  - `is-record.ts:2-5` says it "tests the type only" and that "A caller that must also refuse a non-plain object checks
    the prototype itself". So it is not a plain-object test in the codebase's own terms.
  - `discovery-provider.ts:66-68`, which checks the prototype, is kept local. So is `response-identity.ts:131`.
- The cap1 copies are named `isPlainObject`, so the term is used loosely here. This is why it does not block.
- Fix for a follow-up: "the one `sha256`, the one `deepFreeze`, a shared strict `decodeUtf8` and the shared object test
  `isRecord` (non-null, not an array; it does not check the prototype) (the `isoOf` formatter stays in
  `polaris-dossier`: the support purity guard forbids `Date`)".

**N3, info: two copied texts are not byte for byte, and neither changes the meaning.**
- [Observed] F2(c): the body reads "No tracked file outside this PR's evidence directory carries either value (swept at
  the repair commit by two methods, in the record)." The parenthetical is added before the reviewer's full stop. Its
  claim is true (run 18).
- [Observed] N3's row label is `'a function that carries every field'`, not the raw's `'a function carrying every field'`.
  It matches its sibling `'an array that carries every field'`, and the repair list said to adapt the row to the file.
- [Observed] Every other named text is present verbatim after whitespace normalisation: F1 bullet, F2(a), F2(b), N1,
  N5, N10 (section 6).

**N4, info: main moved after the subject was frozen.**
- `gh/main` is at `1a8864d9` (PR #550), 28 paths, none shared with the PR.
- The local merge typechecks, and 592 of 592 tests pass in the 10 affected test files (run 23).
- The landing merge will be a second main merge. The surface version must be re-derived there (round 1 N4, still the
  coordinator's).

## 5. Every changed output, or the evidence that there is none

[Observed] No runtime output changes between `2e7ab2ec` and `4d92ac95`, beyond what round 1 established for `2e7ab2ec`:
- Production source: the only change is a comment in `is-record.ts`, and its emit is identical (runs 20 and 21). The merge
  adds no line beyond a clean merge (empty remerge diff), and touches none of the PR's 22 production files.
- Equivalence: the pair result is byte-identical to the committed one (run 7), and the record rebuilds byte-identical
  (run 8).
- Tests: 546 of 546 in the eight files. The head tests pass on the base code except the one swept-file list (485/486).
  The whole suite passes: 5,674 passed and 0 failed, 5 pending, locally and on hosted `node`.
- Digest-bound artifacts: no tracked file cites a digest of the repair's edited files (run 19). The surface-version values
  are carried only inside the PR's evidence directory (run 18).
- Test-side acceptances that change, both declared:
  - The purity test accepts five more names. Each is needed (run 10), none is a global the test's comment forbids, and
    every replayed #545 pin is still refused.
  - Five generated tests are removed with the `true` row (F1).

## 6. Verdict on each round-1 item taken, and on the post-merge steps

| Item | Verdict | Evidence |
|---|---|---|
| 1. F1, strict tool byte for byte, selftest, rule 6, regenerated JSON, record, PR bullet | **Met** | Run 3: `fbcee6fc…` at `28024ade`/`945c13f9`. Runs 4, 5, 7, 8. The PR bullet holds the raw :252-255 text verbatim |
| 2. F2 (a), (b), (c) | **Met** | (a) and (b) verbatim; (c) verbatim apart from an added true parenthetical (N3) |
| 3. N1 docstring | **Met** | `mutants.py:9-10` holds the raw :296-297 text verbatim |
| 4. N2 tmpdir | **Met** | `mutants.py:145-147`: `--tmpdir`, else `TMPDIR`, else refuse; no `/tmp` path left (`grep -n -F '/tmp'` gives only the docstring line) |
| 5. N3 row | **Met** | Run 9: kills O8 alone (1/38) and passes at head; without it O8 survives (0/37). Old/new are in `mutants-N.json` |
| 6. N5 AGENTS.md | **Met** (text as prescribed; N2 on its content) | Raw :314-316 verbatim |
| 7. N8 | **Partly met** | The `a number` comments are true. The `true` row's removal rests on a false reason (F1) |
| 8. N10 | **Met** | Raw :337-338 verbatim; emit identical |
| 9. N6 Battery | **Met** | The `lc63s4` result is labelled as `2e7ab2ec` and not claimed for the repair head |
| 10. Classes line | **Met** | `## CC-REV-1 classes` carries round 1's section-2 ruling accurately |
| Merge of main `a1b9bde2` | **Met** | One merge commit, empty remerge diff, no PR path touched |
| Five names in `ALLOWED_IDENTIFIERS` | **Met** | Each is needed (run 10); the comment above the set accounts for them (own declarations, the object predicate's `Array.isArray` and `Readonly<Record<string, unknown>>` type) |
| SM4 selftest case | **Met** (N1 for two gaps it leaves) | Five lines; SM4 is killed by it and the first failing line is the new case (run 5) |

## 7. Test quality

- **N3 row.** It pins one plausible bug, O8, that no other test catches. It is a behaviour assertion with a literal
  expected value. That meets test rigor :42 and bar 10.
- **SM4 cases.** The first kills SM4, R2-M1 and R2-M2. The second is the only case that kills R2-M3, so neither is
  redundant. Both import positions are degenerate (N1).
- **Allow-list.** The set is the minimum: removing any one of the five fails with exactly that name. Run 10 shows that
  the widening does not open the forbidden globals or loaders #545 pinned.
- **`NOT_OBJECTS` rows.** The `a number` comment is true, and `mutants-N.json` backs it at 4 of 12 sites. Removing `true`
  deletes the only test that fails for F at three class-1 calls (F1).
- **Net test delta.** At the repair: +1 −5 over the eight files, 546 tests. At the head: +0 −0 in tests from the
  post-merge commits, since `2f33f137` changes a constant and no test count. Under Fix A it would be +1 −0 at the repair,
  551.

## 8. Cleanup

Deleted:
- my scratch clone `rev-548-r2/clone/` and the worktree I made inside it;
- the TMPDIRs `/tmp/r548b-1` to `/tmp/r548b-8`;
- the re-derived subject (it equals `r2-review.diff`, run 1);
- my `npm ci` log and my working copy of the PR body.

No worktree under `/home/tze/GitHub/syzygy/.worktrees/` was touched. Nothing was pushed, commented, merged or dispatched.
Every kept file is under 300 KB.

| `<path relative to rev-548-r2/>` | `<sha256>` |
|---|---|
| `bool-mutant.json` | `5ef887e328f6d8686d5d5ae24153589aadffb6c9c6ef941a3cc60e31f50707ca` |
| `main-moved-paths.txt` | `1d6bddde9ffa6dd4fabf89f638ffb52df35aa13c12aa4f11fb2401e4418faf12` |
| `own-se-mutants.json` | `48ee6cb6b9e16bd486c96ae2fdf543c83e3c7237fcb8d75cd4a6b4529166e0c8` |
| `r2-mutants.json` | `36af93399fd1525497df8fc5a447ed26971bf6755cb299811cceba07e646dc4a` |
| `r2-mutants.log` | `fad9f13eca8029c8279e2923c0305ca694008422bf43270d2797e3851965c0d8` |
| `se-mutants-rerun.json` | `70cd83576d1d9d92ca5db52ba591d54582872020eb056feb6dad9a071bf42acf` |
| `se-pair.json` | `7864c27fb50eb2ef483e8ff63cb5a8804879572258b6f4c8161af5fdde007726` |
| `test-runs-r2.json` | `460fe6d6847e9a6cbfe23013b34463bf4b5df868671acf7f4695eac175a9cf32` |
| `tools/bool-mutant.py` | `383d7b4b4b72830543d01aa4f6cc997da6214adbbd58fb032cba90046683516e` |
| `tools/own-se-mutants.mjs` | `5cb55dd1809b286551268e77a15b56f057f65bcae5dbe02a754415b9832f8535` |
| `tools/r2-mutants.py` | `66ad3778068c7c4ec9c637e352429ba83beecad8b591beb98c02f490994e17a1` |
| `tools/sm4-fix-lines.txt` | `823d7ef698cb546a2f717d06496d5926b05d065c4c33c0c23599af2aec4d146e` |
