# R-GP-IMPL-SPREAD-LOOPS-3 — CC-REV-1 implementation review of syzygy-bpyt.1.18, round 3
Verdict: REVISE
Reviewed commit: bca6482f
Subject: r3-review.diff sha256 c2eccf9a4dbe52d450dabd723860387cf7178d5e8512eeb71ff11ea1da66e1b7

Reviewer: fresh-context CC-REV-1 reviewer. I did not write the change or its round-1 and round-2 reviews, and I have no access to
the authoring session. Date 2026-10-28 to 2026-10-29. I read no observed repository body, started no daemon and opened no
credential file. Every input below is synthetic or a tracked Syzygy file.

Round 2's four items are all met. F1's assertion, F2's two texts, N1's canaries and N2's `countsAt` are each the round-2 text,
checked by script. The production bytes are unchanged since round 1. Rule 6 reproduces exactly at the head: 8 of 8 mutants killed
and all 10 rows equal to the lane's. R10 and R11 die by "the success-criterion items are not in line order" and by nothing else.
The canaries, the record digest, the full suite, the battery and hosted CI all hold.

**One blocking finding, PR-body text only (F1):** the "Rule 6" section says R10 and R11 both act "past 100,000 items". R11 acts on
any class past 50,000 items. A second sentence in "Review round 2" swaps subject and object: it says the mutants kill something.
Exact replacement texts are below. Under the brief's stopping rule the coordinator applies them by script, with no further round.
There are four notes. None needs the owner.

## 1. Subject identity checks

- [Observed] `sha256sum lead/b118/r3-review.diff` gives `c2eccf9a4dbe52d450dabd723860387cf7178d5e8512eeb71ff11ea1da66e1b7`.
  In my scratch clone, `git diff c672492c bca6482f | sha256sum` gives the same value. **Match.** `git diff --stat` ends "31 files
  changed, 6043 insertions(+), 14 deletions(-)". `git merge-base HEAD c672492c` gives `c672492caace634905b4f285434211436bb7fe24`.
- [Observed] The reading aid `lead/b118/r2-to-r3.diff` hashes to `abdbba70308e8f4185ed22c108a336d65745b47be3651926e855018cee0987e2`.
  `git diff 45f7d855 bca6482f -- <the 31 paths>` gives the same value. **Match.** The round-2 raw hashes to
  `83dd4c0b59bafd5c0784ce3fc22baa3738d8285e89795c655d49b41638b5e248` and the round-1 raw to
  `81ac6cf85fa53efa569750b565845d69ee9ddd23e8ee207f398606b330b8dc1e`. Both match the brief.
- [Observed] **Production bytes:**
  - `git diff 45f7d855 bca6482f -- packages/three-surface-poc-core/src/markdown-code-context.ts packages/three-surface-poc-core/src/project-shape-extraction.ts | wc -l`
    gives `0`. **The coordinator's finding is confirmed.**
  - `git diff --quiet 0f0ce073 bca6482f --` over the same two files exits 0.
  - The numstat against the merge base is `2 1` for each production file.
  - The 31 paths are: `AGENTS.md` 7 0; 24 files under `docs/evidence/syzygy-bpyt-1-18/`; four test files (`git-object-reader.test.ts`
    50 12, `markdown-code-context.test.ts` 40 0, `project-shape-extraction.test.ts` 41 0, `project-shape-model.test.ts` 34 0); and
    the two production files.
  - No other path under `packages`, `apps` or `scripts` appears.
- [Observed] **PR head:** `gh pr view 555 --json headRefOid,state,mergeable` gives `bca6482fc956f51f5df014f971c7dde803f32847`,
  `OPEN`, `MERGEABLE`. `git ls-remote` shows the branch at that commit, at the start and again before writing.
- [Observed] **PR body:** `gh pr view 555 -R Tzeusy/syzygy --json body --jq .body | sha256sum` gives
  `4d9cf21db709e8bdb3f363b8f47f7111f75159565f8e522c9a9e423d575c429c`, at the start and again before writing. **The body I read
  matches the coordinator's freeze.**
- [Observed] **Commits after round 2:**
  - `e6c08baa` changes `build-record.py`, `spread-mutants.py` and three test files (5 files, +20 -2).
  - `8e9cf897` is a merge with parents `e6c08baa` and `c672492c`.
  - `7d4ee02d` changes `build-record.py` (1 line) and `canary-threads-pool.txt`.
  - `674e443c` changes `spread-mutants.py` (1 line) and `spread-mutants-output.json`.
  - `bca6482f` changes `build-record.py` (1 line), `spread-loops-2026-10-28.json`, `spread-mutants-output.json` and
    `test-delta-output.json`.
- [Observed] **Main:** `git ls-remote` showed main at `c672492caace634905b4f285434211436bb7fe24` at the start and again before
  writing. PRs #556 and #557 had not landed. The head already contains `c672492c` (`8e9cf897`), so a local merge with current main
  is the head itself ("Already up to date"; `git log c672492c..gh/main` is empty). The four-file runs at the head (section 3, R2
  and R3) are therefore the runs on that merge.
- [Observed] **Hosted CI:** `gh pr checks 555` gives "checks	pass	24m39s" and "node	pass	4m21s". `gh run list --commit
  bca6482fc956f51f5df014f971c7dde803f32847` gives `node-ci … success` and `governance-docs … success`, both `completed`, both
  with that `headSha`.

## 2. Clauses relied on, and the class ruling

CC-REV-1 (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at `bca6482f`):
- `:18-20` "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- `:35-37` "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam
  (VIS-7); 4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- `:40-41` "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend
  on;"
- `:49-51` "**The change record states** which classes the change touches, or "none," so a misclassification is a findable
  violation after the fact. **A reviewer or the owner** may reclassify at any time."

GP-Q0 (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md` at `bca6482f`):
- `:62` "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security), and class-6 pull requests that remove an endpoint."
- `:64-66` "an old-versus-new differential over a mutated-record corpus that includes records with altered prose; a rule-6 mutant
  for each predicate; a non-blocking owner notice in the cycle report."
- The stop clause, `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

Follow-ups record (`OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md` at `bca6482f`):
- `:20-21` "Each answer here is now a listed change for the work it describes, and for nothing wider."
- Q1, `:98-99` "The owner directs that such texts be read like any shorter text, at both sites."
- Q1, `:106-107` "a mutation per site that restores the old call and must make its test fail; the differential re-run at the pull
  request's head."
- Q1, `:109-110` "A text that crashes today gets the decision a shorter fence or list would get; nothing new is refused."
- Q1, `:118-119` "Review: CC-REV-1 class 4 (security); the reviewer may add class 3 (deterministic observation)."
- Q1 follow-up, `:128` "Selected: **"Land #544 first (Recommended)"**."

**Class ruling.** It is unchanged from rounds 1 and 2, because no production byte has moved since round 1.
- **Class 4: touched** [Observed]. The change is in the active-content screen and its five callers.
- **Class 3: touched** [Observed]. An outcome that depended on stack depth now depends on the text.
- **Class 6: not touched** [Inferred]. No route, field or vocabulary changes. GP-Q0's class-6 trigger, removing an endpoint, does
  not arise.
- **Classes 1, 2, 5 and 7: none.**

Round 3's delta changes one test assertion, adds two canaries and changes evidence. None of these changes what a gate accepts or
refuses, so the stop clause is not reached. **Owner notice, not owner question.** The only changed outputs are the
throw-to-decision changes that Q1 lists, at its two sites. F1 is body wording. The notes concern test strength and record naming.
None needs an owner ruling.

The test-rigor bar (`git show bca6482f:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
- `:42` "**A test is worth keeping only if some plausible bug makes it fail.**"
- `:64-67` "**No tautologies** — A test that mirrors the implementation's logic to compute its expected value … verifies nothing.
  Expected values are literals or independently derived."
- `:78-81` "**Deterministic or quarantined** — A test that fails intermittently is worse than no test"
- `:82-84` "**A failure names the defect** — … A maintainer should localize the bug from failure output alone."
- `:93-96` "**Growth is governed** — … Reviews state the net test delta".

`AGENTS.md` at `bca6482f`:
- rule 6, `:126`: "Mutate the input and confirm the check fails, per predicate, before trusting it";
- rule 10, `:133`: "Freeze the bytes a review is bound to; any later edit retires the review.";
- rule 11, `:134`: "An evidence record names its subject and the subject's digest; a record that names neither cannot be re-checked
  against the bytes it describes."

## 3. What I ran, and the results

**Setup.**
- I made a scratch clone of `/home/tze/GitHub/syzygy` and fetched `agent/syzygy-bpyt.1.18` and `main` from GitHub. I checked out
  `bca6482f` detached.
- `npm ci` exited 0.
- Every `dist/` was absent throughout: `find . -name dist -not -path '*/node_modules/*'` was empty, and I built nothing.
- The host runs node v24.6.0 and vitest 3.2.7. I ran one vitest process at a time.

**My own process error, and how it was contained.** During my first `spread-mutants.py` run (TMPDIR `/tmp/r555c-1`), I ran
`git checkout -b r3tmp 45f7d855` in the same clone by mistake. The tool was then at MU6. That checkout swapped three test files
under the running tool.
- I stopped the run by its own PID (52124; the tool's vitest child had already exited) and saw "EXIT 143".
- I restored the files the tool had left mutated (`git checkout -- .`), returned to `bca6482f` detached and deleted the branch.
  `git status --porcelain` was then empty.
- I deleted `/tmp/r555c-1` and that run's output, and re-ran from scratch as R1 below.

No figure in this review comes from the aborted run.

| # | Run | loadavg (1 min) before / after | Result, verbatim |
|---|---|---|---|
| R1 | The lane's `spread-mutants.py` at the head (`<clone> bca6482f… 8d5d4bab /tmp/r555c-2 <out>`) | 32.98 / 31.18 | "CONTROL {'mask': (54, 0), 'extractor': (89, 0), 'reader': (91, 0), 'model': (34, 0)}". MU1 to MU6, R10, R11 and BASE "killed". `{"codeCommit": "bca6482fc956f51f5df014f971c7dde803f32847", "baseCommit": "8d5d4bab", "controlFailing": 0, "mutants": 8, "killed": 8, "survived": [], "baseFailingTests": 20}`, exit 0 (`lane-mutants-head.json`) |
| R2 | `tools/mutant-compare.py`: my R1 against the lane's `spread-mutants-output.json`, and every failure message from the vitest reports | – | For 10 of 10 rows, `detectors`, `failingTests` (as sets), `replacements` and `mutatedFileSha256` are all `True`. Every lane row has `ranAt` `674e443c`. 0 timeouts in any row. BASE's 20 failures are all new tests (`allFailingAreNewTests` `True`), all "RangeError: Maximum call stack size exceeded" (`lane-mutants-head-messages.json`) |
| R3 | My `tools/mutants.py` (round 2's runner plus R13) at the head, `--only` L5, R9, R12, R13 | 28.42 / 29.37 | "CONTROL 268 0"; "L5-mask-reversed killed 7"; "R9-extractor-swaps-at-global-index killed 1"; "R12-mask-chunks-last-first killed 3"; "**R13-mask-size-gated-reversal SURVIVED 0**"; 0 timeouts (`own-mutants-head.json`; N1) |
| R4 | R3 with N1's proposed mask assertion (`tools/mask-order-assertion.py`, a scratch commit `cc64132b`, then `git reset --hard bca6482f`), `--only` L1, L5, R12, R13 | 33.96 / 39.76 | "CONTROL 268 0"; L1 killed 18, L5 killed 10, R12 killed 6, **R13 killed 3**. Each of the three new kills is "AssertionError: the masked text differs from every non-terminator byte blanked, in line order: expected false to be true" (`own-mutants-with-mask-assertion.json`) |
| R5 | Both production files restored to their `8d5d4bab` bytes; the four test files with `--pool=threads`; then `git checkout --` | 41.86 / 41.07 | Four "×" lines, and only these: "× a very long closed fence > one spread call over 200,002 arguments still overflows the stack in this test process", "× a source whose class holds 130,000 items > one spread call over 130,002 arguments …", "× a 200,000-line closed fence under the read limit (GP-B2 Q1) > one spread call over 200,002 arguments …", "× a very long fence or list does not abort the observation > one spread call over 200,002 arguments …"; "Tests  4 failed \| 264 passed (268)" |
| R6 | The four test files at `8d5d4bab` over the head code (`git show 8d5d4bab:` into the tree, then `git checkout --`) | 33.37 / 32.46 | `241 241 0` (total, passed, failed); reader 81, mask 44, extraction 87, model 29 |
| R7 | Full vitest at the head, every `dist/` absent, default pool and timeouts, `TMPDIR=/tmp/r555c-7 npx vitest run --reporter=json` | 31.15 / 34.13 | `numTotalTests 5813, numPassedTests 5808, numFailedTests 0, numPendingTests 5`, `success True`, 256 files, failed files `[]`. No file failed, so none was re-run. The 5 skipped are environment-gated: strace is absent, three are `SYZYGY_POC_BUTLERS_REPO`-gated and one is a real-browser capture. All 27 new tests passed, in at most 2,419 ms (`full-suite-summary.json`) |
| R8 | `npm run typecheck` at the head | 30.83 / 27.75 | exit 0, `grep -c 'error TS'` gives 0 |
| R9 | `PROJECT-STATUS.md` battery, round 2's retained `rev-555-r2/tools/battery.py` (sha256 `f41fae25…`, run in place) in the dist-free clone | 27.12 / 31.47 | "commands 114 assignments 2 nonzero 0". Every command reported an exit status (0 `None`), and the tree was clean afterwards |
| R10 | `build-record.py <clone> 0f0ce073046adc10c2eebe35e9867b67ec3f9e49 8d5d4bab 674e443ce17921565d9eb709d4ce7621f9f6795e` | – | exit 0. The record's sha256 is `2062c808a4fe6014f82207e816311247cc7260508be88a3fcc9bfaa6506ba1a5` before and after, equal to the body's figure. `git status --porcelain` is empty |
| R11 | The record's `files` map against the directory | – | "disk 23 listed 23 onlyDisk [] onlyListed [] mismatch []". The directory holds 24 files (`git ls-files` gives 24); the record itself is excluded by design |
| R12 | `tools/exact-texts.py` over the round-2 raw, the frozen body, `bca6482f` and `45f7d855` | – | Section 5. 0 U+00A0 in the raw or the body |
| R13 | `ast.parse` of `build-record.py` at `e6c08baa`, `674e443c` and `bca6482f` | – | `e6c08baa` and `674e443c`: "SyntaxError: closing parenthesis ')' does not match opening parenthesis '{'". `bca6482f`: "parses" (N3) |
| R14 | `git diff --numstat 8d5d4bab 674e443c` over the four test files, and `8d5d4bab 0f0ce073` over the two production files | – | 50 12, 40 0, 41 0, 34 0 and 2 1, 2 1: each equals its record row's `added`/`removed` |

## 4. Findings

### F1 (blocking; PR-body text only, low substance): the "Rule 6" section misstates R11's size, and "Review round 2" says the mutants kill

**Evidence.**
- [Observed] Body, "Rule 6" section: "R10 and R11 (round 2) are a size-gated reversal and a chunked spread appended last-first, both
  past 100,000 items."
- R11's fragment, in `spread-mutants.py` and in the R11 row, is
  `for (let at = Math.floor((result.items.length - 1) / 50_000) * 50_000; at >= 0; at -= 50_000) all.push(...result.items.slice(at, at + 50_000));`.
  For a class of 50,001 to 100,000 items, it appends `[50000, n)` before `[0, 50000)`. The fault therefore starts past 50,000
  items, not past 100,000.
- The row's own note says "identical to the loop for a class of 50,000 items or fewer", and so does round 2's raw.
- "Both past 100,000 items" reads as a gate shared by both mutants. That is true of R10 only, whose fragment tests
  `result.items.length > 100_000`.
- [Observed] Body, "Review round 2" section, F1 bullet: "Two mutants now kill what round 1's test missed: R11 … and R10 …".
  Mutants do not kill; tests kill mutants. R2 shows that the 130,000-item extractor test is what kills R10 and R11.

**Failure scenario.** Someone reads the body to size a fixture for a later chunked-spread fix (`syzygy-bpyt.54`). They take the
100,000 figure, write a fixture of 60,000 to 100,000 items and believe it cannot see R11's fault, though it can. Separately, the
second sentence states the rule-6 relation backwards in the one place that records it for round 2.

**Exact fix** (body only; each old text occurs exactly once in the frozen body, checked by script):
1. Replace
   `R10 and R11 (round 2) are a size-gated reversal and a chunked spread appended last-first, both past 100,000 items.`
   with
   `R10 and R11 (round 2) are a reversal gated at classes past 100,000 items and a chunked spread whose 50,000-item chunks are appended last-first (identical to the loop for a class of 50,000 items or fewer).`
2. Replace
   `Two mutants now kill what round 1's test missed: R11 (a chunked spread appended last-first) and R10 (a reversal gated at 100,000 items).`
   with
   `The test now kills two mutants that round 1's test missed: R11 (a chunked spread appended last-first) and R10 (a reversal gated at 100,000 items).`

No figure, record or digest changes. I checked every other sentence of the body against my runs (section 5), and none is false at
`bca6482f`.

### N1 (note, low): no long-fence mask test pins line order, so a size-gated reversal at the mask survives

[Observed] R3: R13 replaces the mask loop with
`for (let at = 0; at < pending.length; at += 1) out.push(blank(pending[pending.length > 100_000 ? pending.length - 1 - at : at] ?? ''));`.
It is the mask counterpart of R10, and it survives all 268 tests.
- The 200,000-line exact-bytes test (`markdown-code-context.test.ts:252-260`) uses an opener and a closer of equal length around
  identical lines, so its line sequence is a palindrome. Reversing it changes no byte. On that input R13 is an equivalent mutant,
  not a missed wrong output.
- The test that does have an asymmetric line, the `<script>` test (`:262-269`), checks only `got.masked.slice(0, got.masked.length - 8).trim()`
  against `''`, which ignores order.
- MU5 (the full reversal) is killed only by 7 small-fixture tests. So the answer to the brief's question is: MU6 now also dies past
  50,000 items, by the new order assertion, while MU5 does not.
- The natural fault, a chunked spread in the wrong chunk order (R12), is killed by the exact-bytes test (R3). That is why this is a
  note and not a finding: the remaining survivor needs a size gate.

Optional fix [verified, R4]. In `packages/three-surface-poc-core/src/markdown-code-context.test.ts`, replace
```ts
    expect(got.masked.slice(0, got.masked.length - 8).trim()).toBe('');
```
with
```ts
    // Exact bytes, so a reordered fence fails: the script line is the fence's only line of its length.
    expect(got.masked === `   ${end}        ${end}${` ${end}`.repeat(LINES)}   ${end}<script>`, 'the masked text differs from every non-terminator byte blanked, in line order').toBe(true);
```
`tools/mask-order-assertion.py` applies exactly this and asserts that the old line occurs once. With it, the control passes 268
with 0 failing, and R13, L5 and R12 are killed by "the masked text differs from every non-terminator byte blanked, in line order".
The test count does not change. Suitable for a follow-up bead, since it does not change these bytes' correctness.

### N2 (note, low): the record still calls the tests commit "code commit" in two places

[Observed] `subject.codeCommit` is `0f0ce073…` (`spread-loops-2026-10-28.json:17`), but `rule6.summary.codeCommit` is
`674e443c…` (`:709`), and the control row's id is `CONTROL-code-commit` (`:719`). Both come from `spread-mutants.py`, whose
argument is named `code_commit`. The rule-6 sentence now names the tests commit correctly (F2 of round 2 is met), so no sentence
is false. But one record now uses "codeCommit" for two different commits.

Separately, `build-record.py:5` still describes the tests commit as "the commit the review-round-1 test edits and the mutants ran
at". It now holds round 2's edits as well.

Fix for a follow-up:
- in `spread-mutants.py`, rename the summary key `'codeCommit'` to `'ranAt'` and the id `'CONTROL-code-commit'` to
  `'CONTROL-tests-commit'`;
- in `build-record.py:5`, replace `the review-round-1 test edits` with `the review-round test edits`;
- re-run both tools.

Each change alters the record digest, so it belongs with the next re-run, not this PR.

### N3 (note, information): `build-record.py` does not parse at two intermediate commits

[Observed] R13. At `e6c08baa` and `674e443c`, F2's new text sits in a single-quoted Python string. Its apostrophe ("the code
commit's") ends the string, so the file raises `SyntaxError`. `bca6482f` re-quotes it with double quotes, and it parses and
rebuilds the record byte for byte (R10).
- This is the lane's second addition. It was needed, and it keeps the text exact (section 5).
- It matters only to someone who checks out `e6c08baa`..`674e443c` and runs the builder, for example in a bisect.
- The body's "Applied … in `e6c08baa` (tests and tools)" is true of the text.

No change.

### N4 (note, information): `674e443c` and the head differ in one tool line as well as in outputs

[Observed] `git diff --stat 674e443c bca6482f` lists `build-record.py` (1 line, the rule-6 sentence and its quotes),
`spread-loops-2026-10-28.json`, `spread-mutants-output.json` and `test-delta-output.json`.
- So the lane's "differs from the head only in evidence outputs" is not exact: one evidence tool changed too.
- Nothing the mutants read changed: the two production files, the four test files, `spread-mutants.py`, the root configs and
  `node_modules` inputs.
- My re-run at the head equals all 10 rows of the lane's run at `674e443c` (R2).

No change.

## 5. Verdicts on each round-2 item and each lane addition

Exact-text check (R12, `tools/exact-texts.py`). Every text was cut from the round-2 raw, or from its retained
`order-assertion.patch`, by regex or by line, never retyped. Each was searched for in `git show bca6482f:<file>` or in the frozen
body, both as is and with whitespace folded. The raw and the body each contain 0 U+00A0.

| Item | Verdict | Evidence |
|---|---|---|
| F1 (order assertion) | **Met** | Each of the patch's 4 added lines occurs once in the head's `project-shape-extraction.test.ts` (`[1, 1, 1, 1]`). The raw's replacement block matches after folding, at `:1151-1156`. The blob at the head is `e459d7845586c1fb49a3da047b3fdf6aa99617df`, the post-image named in the patch's own `index 8d5ed582..e459d784` line. R10 and R11 are each killed by exactly one test, "a source whose class holds 130,000 items is extracted, every item kept in class order", with "AssertionError: the success-criterion items are not in line order: expected false to be true // Object.is equality" and nothing else (R2). MU6 now also fails that test with the same message, and R9 is killed by it (R3) |
| F1 steps 1-3 (re-run the mutants, test delta and record; update the body) | **Met** | R1 and R2 reproduce the lane's 10 rows. The body's record sha256 equals R10. The body's rule-6 commit (`674e443c`) equals every row's `ranAt` |
| F2 step 1 (`build-record.py`) | **Met** | old text 0 times; new text, "the control run at the tests commit (the code commit's production bytes with the reviewed test files) fails none.", exactly once (`build-record.py:100`) and rendered at `spread-loops-2026-10-28.json:100` |
| F2 step 2 (PR body) | **Met** | old text 0 times; new text, "Repaired in `b6ab0a2a` (tests, `AGENTS.md`, evidence tools and the ceiling figure; no production byte)", exactly once |
| F2 step 3 (record re-run, body sha256) | **Met** | R10 |
| N1 (canaries) | **Met** | The mask canary's `it` block, with `LINES + 2` replaced by the size N1 named, occurs once in each file and inside the named describe: reader `:468` (`LONG_LINES + 2`), model `:1021` (`200_002`). All four canaries pass under the default pool, at the head and with the base lines (R1's CONTROL and BASE reports, 4 of 4 `passed` each). Under `--pool=threads` with the base lines, exactly the four fail (R5) |
| N2 (`countsAt`) | **Met** | The text occurs once (`build-record.py:41`). All 6 `subject.files` rows carry it: the four test rows give `674e443c…`, the two production rows `0f0ce073…`. Each row's `added`/`removed` equals `git diff --numstat` at the commit it names (R14) |
| R10 and R11 as mutant rows | **Met** | Both are rows of `spread-mutants.py`, with `old` and `new` fragments equal to round 2's `tools/mutants.py` (compared by script), and killed (R1) |

**Lane addition 1, "eight mutants" in the record's rule-6 sentence: accepted.** It is true: the summary gives `"mutants": 8,
"killed": 8`. The parenthetical's breakdown matches the rows: two spread restores (MU1, MU2), MU3 to MU6 off-by-one and order, and
R10 and R11. A count that still said "six" would have been a false sentence. This stays within round 2's ask, since F1 step 2
required the record to be rebuilt over the new rows.

**Lane addition 2, double quotes: accepted.** It was necessary: the single-quoted form does not parse (R13, N3). The quoted text
is byte-exact (F2 step 1).

**Mutant-tool fix at `674e443c`: accepted.** The old filter, `r['id'].startswith('MU')`, would have left R10 and R11 out of
`mutants`, `killed` and `survived`. The summary would then have said 6 of 6, and a surviving R10 or R11 would never have been
reported. The new filter, `not r['id'].startswith(('CONTROL', 'BASE'))`, gives 8 of 8 in R1. The fix is needed to add the
directed rows, and it changes nothing else in the tool.

**PR body, against my runs, sentence by sentence:**
- **Tests.** "+27 ~6 -0 (mask 10, reader 10, extractor 2, model 5; 241 to 268 …)" is true. R6 gives 81, 44, 87 and 29 at the base
  (241). R1's control gives 91, 54, 89 and 34 at the head (268). The differences are +10, +10, +2 and +5. The `~6` is round 2's N3.
- **Rule 6.** "Eight mutants …", "Control at `674e443c` …: 0 failures in 268 tests", "All 8 killed" and "fails 20 of the new tests"
  are true (R1, R2).
- **Canaries.** "the four canaries are the only failures" and "4 failed, 264 passed of 268 … the default pool fails 20 tests" are
  true (R5, R1 BASE).
- **Full suite.** "5,808 passed, 5 skipped, 0 failed (5,813 tests …)" is true (R7).
- **Battery and typecheck.** "114 commands, 0 nonzero" and "exit 0, 0 `error TS`" are true (R9, R8).
- **Hosted CI.** "Hosted `checks` (24m39s) and `node` (4m21s) passed at that head" is true (section 1).
- **Record.** "Record sha256 `2062c808…`" is true (R10).
- **Production bytes.** "2 production files, +4 -2 lines" is true (numstat). "the production bytes are the same at every later
  commit of this branch" is true.
- **The merge.** "it changes `AGENTS.md` and `owner-act-drafter.test.ts` only under the paths this PR touches" is true when
  "paths" means the PR's directories. Of the merge's 112 changed files (`git diff --name-only e6c08baa 8e9cf897`), those two are the only ones in `AGENTS.md`,
  `packages/three-surface-poc-core/` or `docs/evidence/syzygy-bpyt-1-18/`.
- **Unchanged since round 2.** The differential, trace and ceiling figures come from files unchanged since round 2. Round 2 checked
  them, and `git diff --stat 45f7d855 bca6482f` does not list them.
- **False.** The only false sentences are F1's two.

## 6. Test quality

- **Oracle independence** (bar `:64-67`) [Observed]: round 2's F1 is closed. The new assertion takes its expected order from the
  text, since the bullets sit on consecutive lines, and not from a run of the module. It kills R9, R10, R11 and MU6 at 130,000
  items (R2, R3). At the mask, the exact-bytes test is also text-derived. Its one gap is N1.
- **Regression pins** (bar `:58-59`) [Observed]: BASE fails 20 of the 27 new tests, all with `RangeError` (R2). The 7 that pass
  at the base are 3 unclosed-fence guards and 4 canaries. The canaries test the process, by design.
- **Rule 6** (rule 6): 8 of 8 lane mutants are killed, each by a value assertion or a `RangeError`, never a timeout (R2). My own
  L5, R9 and R12 are killed. R13 survives, as an equivalent mutant on the existing inputs (N1).
- **Determinism** (bar `:78-81`): the loops do not depend on the stack. The canaries do, by design. Round 2's N4 margin (3.7% for
  the extractor canary) still applies, unchanged. Every run here was green at load averages of 27 to 42.
- **Failure messages** (bar `:82-84`): each kill of R10 and R11 names the defect ("not in line order"). Under threads, the
  canaries fail by name (R5).
- **Net delta** (bar `:93-96`): +27 ~6 -0 by the inventory (+27 ~0 -0 in substance; round 2's N3), 241 → 268 over four files.
  Round 2's F1 fix added no test. N1 added one canary in each of two files. N1's proposed fix here adds none.

## 7. Cleanup

**Deleted:**
- the scratch clone (at `bca6482f`, with its `node_modules` and the discarded scratch commit `cc64132b`);
- my TMPDIRs `/tmp/r555c-1` to `/tmp/r555c-8`. I created all eight, and `ls -d /tmp/r555c-*` now finds none;
- the vitest JSON of the full suite (2.2 MB; its counts and the 27 new tests' status and durations are in
  `full-suite-summary.json`);
- the `npm ci`, typecheck, battery, threads-pool, mutant and full-suite logs, the battery's per-command JSON and the load-average
  files (each quoted in section 3);
- the copy of the PR body, my reading copy of the round-2-to-round-3 diff, and an empty `vitest list` attempt;
- this raw's draft name (`raw-draft.md`), renamed to the raw.

Every temporary file restore was followed by `git status --porcelain` empty: the base production files in R5 and the base test
files in R6. My scratch commit for N1's assertion was discarded by `git reset --hard bca6482f`. The aborted first mutant run is
described in section 3. No process from my tree is left running. I made no PR comment, push, merge, workflow dispatch or `bd`
mutation.

**Kept** under `rev-555-r3/` (sha256 computed after the last write; none is over 300 KB):

| File | sha256 |
|---|---|
| `exact-texts.json` | `160581011afcceacae37dea5ecf749b854bb1a803875f4855ee406e66d15ac9a` |
| `full-suite-summary.json` | `75844caf55ff30b95c23c754b8b2dcce19e6eac4267b108373055516287d2468` |
| `lane-mutants-head-messages.json` | `84405627522741e8de25514e165462df8dc44871562e1eab5872e6b188ae4e6e` |
| `lane-mutants-head.json` | `58dc91fe71ba668acd204a4128a5eadb5e50815c9b874906efcfe3d84ea8d742` |
| `own-mutants-head.json` | `3e38bba187bd9f4e38ae65d7d4570989d1016fc18c486021beff24bd3ad740bf` |
| `own-mutants-with-mask-assertion.json` | `e576cc39e9020d6810b0868fa4bde734ad869354a997b00784c3510a135e55e9` |
| `tools/exact-texts.py` | `b358b672bcede26700a239d0660b5620d4d36f8e0c31ddc0560feafb449fa34f` |
| `tools/mask-order-assertion.py` | `3d0fca4f7b7afa1912af618630a7bd6e4e13d3679e100ada31a4b10ca6aea049` |
| `tools/mutant-compare.py` | `57b44a8e4105d560642dade6d50f2628ed889eed970b5aa1396aad283090b9fc` |
| `tools/mutants.py` | `0427014555fa3a82c2ebb9f5914587fe67a25c1303c51bc09272718b7f4d2e6b` |
| `tools/suite-summary.py` | `4ed9f478775cf00557992ade1e4ba634c95e92386c7268c39352bebff9ea6744` |

What each file is:
- `tools/exact-texts.py` is new for round 3.
- `tools/mutants.py` is round 2's runner with R13 added; its docstring says so.
- `tools/mutant-compare.py`, `tools/mask-order-assertion.py` and `tools/suite-summary.py` are new.
- The battery was run from round 2's retained `rev-555-r2/tools/battery.py` and is not duplicated here.
- Every result file is named by its run in section 3.
