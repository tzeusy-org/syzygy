# R-GP-IMPL-SPREAD-LOOPS-2 — CC-REV-1 implementation review of syzygy-bpyt.1.18, round 2
Verdict: REVISE
Reviewed commit: 45f7d855
Subject: r2-review.diff sha256 a7949274db66cdbbc8c03e5fde06c20be7520e1931a26866bdc4f6354685d132

Reviewer: fresh-context CC-REV-1 reviewer. I did not author the change or its round-1 review, and I have no access to the
authoring session. Date 2026-10-28. I read no observed repository body and started no daemon. Every input below is synthetic
or a tracked Syzygy file.

Every round-1 item has been applied as the round-1 reviewer wrote it (23 of 23 texts found by script). The production bytes are
unchanged since round 1. Rule 6 reproduces exactly at the head, and the canaries do what N1 asked. Two blocking findings remain:
- **F1:** the 130,000-item extractor test is titled "every item kept in class order", but it gets its order from the module
  under test, so a size-dependent order fault passes it. One natural case is a chunked spread that appends its chunks
  last-first.
- **F2:** one sentence in the record says the rule-6 control ran "at the code commit". By the record's own definitions it ran at
  the tests commit. The PR body's matching parenthetical says round 1's repair commit changed "code".

Each has exact replacement code or text, verified below. There are four notes.

## 1. Subject identity checks

- [Observed] `sha256sum lead/b118/r2-review.diff` gives `a7949274db66cdbbc8c03e5fde06c20be7520e1931a26866bdc4f6354685d132`. In my
  scratch clone, `git diff 29db2b11 45f7d855 | sha256sum` gives
  `a7949274db66cdbbc8c03e5fde06c20be7520e1931a26866bdc4f6354685d132`. **Match.** `git diff --stat` ends "31 files changed, 5886
  insertions(+), 14 deletions(-)". `git merge-base HEAD 29db2b11` gives `29db2b11153990f465c0b86fb3341865ae6459ac`.
- [Observed] The reading aid `lead/b118/r1-to-r2.diff` hashes to `6cc6aa024f06a8511d59485f51a5eed04679e28ec17ce49900096c6863ecfae2`,
  which matches the brief. The round-1 raw hashes to `81ac6cf85fa53efa569750b565845d69ee9ddd23e8ee207f398606b330b8dc1e`, which
  also matches.
- [Observed] `gh pr view 555 --json headRefOid,state,mergeable` gives `45f7d85571f2d216313a2ee399b9d091c37a9e68`, `OPEN`,
  `MERGEABLE`. `git ls-remote` shows the branch at the same commit.
- [Observed] **PR body:** `gh pr view 555 -R Tzeusy/syzygy --json body --jq .body | sha256sum` gives
  `c2619b6afbe1fd89eaf64655a5d3c893af92add1ca28ec009e71d1c7a9e94a96`, at the start and again before writing. **Match** with the
  coordinator's freeze.
- [Observed] **Paths:** `git diff --numstat 29db2b11 45f7d855` lists exactly these:
  - two production files at `2 1` each;
  - four test files: `git-object-reader.test.ts` 44 12, `markdown-code-context.test.ts` 40 0, `project-shape-extraction.test.ts`
    37 0 and `project-shape-model.test.ts` 28 0;
  - `AGENTS.md` 7 0;
  - 24 files under `docs/evidence/syzygy-bpyt-1-18/`.
- [Observed] **Production bytes unchanged since round 1:** `git diff 241b28ff 45f7d855 --
  packages/three-surface-poc-core/src/markdown-code-context.ts packages/three-surface-poc-core/src/project-shape-extraction.ts |
  wc -l` gives `0`. Main changed neither file. Against the merge base, the two files differ only by the two loops and their two
  comment lines: `for (const pendingLine of pending) out.push(blank(pendingLine));`, which was `out.push(...pending.map(blank));`,
  and `for (const item of result.items) all.push(item);`, which was `all.push(...result.items);`. No other production byte changes.
  The 31-file numstat above has no other path under `packages`, `apps` or `scripts` outside tests.
- [Observed] **What the mutants ran against:** `git diff --quiet d7ffa014 45f7d855 --` over the four test files and the two
  production files exits 0 ("4 tests + 2 prod identical d7ffa014..45f7d855"). The root `vitest.config.ts`, `package.json`,
  `package-lock.json`, `tsconfig.json` and the core package's `package.json` and `tsconfig.json` show no diff over the same range.
  Over `723cf679..45f7d855`, `packages/three-surface-poc-core` changes in `authority-artifact-fields.ts` and its test only (2 files,
  +50 -5), as the body says.
- [Observed] **Main:** at the start, `gh/main` was `29db2b11`, the merge base. Before writing, `git ls-remote` showed main at
  `c672492caace634905b4f285434211436bb7fe24` (PR #554, `syzygy-bpyt.46`). `git diff --name-only 29db2b11 c672492c` lists 112 paths.
  Their exact-path intersection with the PR's 31 paths is `['AGENTS.md']`. The only one in `packages/three-surface-poc-core/` is
  `owner-act-drafter.test.ts`, and none is a root config. A local merge of `c672492c` onto `45f7d855` auto-merged `AGENTS.md` with
  no conflict and kept the new bullet once (`grep -c` gives 1). The four changed test files on that merge gave "Test Files  4
  passed (4)" and "Tests  266 passed (266)" (loadavg 24.43 before, 23.67 after).
- [Observed] **Hosted CI:** `gh pr checks 555` gives "checks	pass	20m25s" and "node	pass	3m28s". `gh run list --commit
  45f7d85571f2d216313a2ee399b9d091c37a9e68` gives `node-ci … success` and `governance-docs … success`, both at that `headSha`.

## 2. Clauses relied on, and the class ruling

CC-REV-1 (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at `45f7d855`):
- `:18-20` "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- `:35-37` "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam
  (VIS-7); 4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- `:40-41` "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend
  on;"
- `:49-51` "**The change record states** which classes the change touches, or "none," so a misclassification is a findable
  violation after the fact. **A reviewer or the owner** may reclassify at any time."

GP-Q0 (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`):
- `:62` "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security), and class-6 pull requests that remove an endpoint."
- `:64-66` "an old-versus-new differential over a mutated-record corpus that includes records with altered prose; a rule-6
  mutant for each predicate; a non-blocking owner notice in the cycle report."
- The stop clause, `:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

Follow-ups record (`OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md`):
- `:21` "Each answer here is now a listed change for the work it describes, and for nothing wider."
- Q1, `:98-99` "The owner directs that such texts be read like any shorter text, at both sites."
- Q1, `:106-107` "a mutation per site that restores the old call and must make its test fail; the differential re-run at the pull
  request's head."
- Q1, `:109-110` "A text that crashes today gets the decision a shorter fence or list would get; nothing new is refused."
- Q1, `:118-119` "Review: CC-REV-1 class 4 (security); the reviewer may add class 3 (deterministic observation)."
- Q1 follow-up, `:128` "Selected: **"Land #544 first (Recommended)"**."

**Class ruling.** It is unchanged from round 1, because no production byte has moved since then.
- **Class 4: touched** [Observed]. The change is in the active-content screen and its five callers.
- **Class 3: touched** [Observed]. An outcome that depended on stack depth now depends on the text.
- **Class 6: not touched** [Inferred]. No route, field or vocabulary changes. GP-Q0's class-6 trigger, removing an endpoint,
  does not arise.
- **Classes 1, 2, 5 and 7: none.**

Round 2 changes only tests, `AGENTS.md` and evidence. None of them changes what a gate accepts or refuses, so the stop clause is
not reached. **Owner notice, not owner question:** the only changed outputs are the throw-to-decision changes that Q1 lists, at
its two sites. My two findings are about test strength and record wording. Neither needs an owner ruling.

The test-rigor bar (`git show 45f7d855:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`):
- `:42` "**A test is worth keeping only if some plausible bug makes it fail.**"
- `:64-67` "**No tautologies** — A test that mirrors the implementation's logic to compute its expected value … verifies nothing.
  Expected values are literals or independently derived."
- `:78-81` "**Deterministic or quarantined** — A test that fails intermittently is worse than no test"
- `:82-84` "**A failure names the defect** — … A maintainer should localize the bug from failure output alone."
- `:93-96` "**Growth is governed** — … Reviews state the net test delta".

`AGENTS.md` at `45f7d855`:
- rule 6, `:126`: "Mutate the input and confirm the check fails, per predicate, before trusting it";
- rule 11, `:134`: "An evidence record names its subject and the subject's digest; a record that names neither cannot be
  re-checked against the bytes it describes."

## 3. What I ran, and the results

Setup: a scratch clone of `/home/tze/GitHub/syzygy` at `45f7d855`, with `gh` fetched, `npm ci` exit 0 and every `dist/` absent
(`find . -name dist -not -path './node_modules/*'` was empty). I also used two worktrees, one at `45f7d855` and one at `8d5d4bab`,
each with its own `npm ci` and `npx tsc -b packages/three-surface-poc-core` (exit 0 each). The base `dist` holds
`out.push(...pending.map(blank));` once, and the head `dist` holds `for (const pendingLine of pending)`. The host runs node
v24.6.0 on 12 cores. I ran one vitest process at a time.

| # | Run | loadavg (1 min) before / after | Result, verbatim |
|---|---|---|---|
| R1 | Full vitest at `45f7d855`, every `dist/` absent, default timeouts and pool, `TMPDIR=/tmp/r555b-1 npx vitest run --reporter=json` | 16.23 / 42.10 | `numTotalTests 5790, numPassedTests 5785, numFailedTests 0, numPendingTests 5`, `success True`, 256 files, failed files `[]`. No file failed, so no file was re-run. The 5 skipped are environment-gated: strace is absent, three are `SYZYGY_POC_BUTLERS_REPO` gated, and one is a real-browser capture. The 25 new tests all passed, in 1 to 1,976 ms (`full-suite-summary.json`) |
| R2 | The four test files on a local merge with main `c672492c` | 24.43 / 23.67 | "Test Files  4 passed (4)", "Tests  266 passed (266)" |
| R3 | Canary files (mask and extraction), default pool | 36.70 / 35.77 | "Test Files  2 passed (2)", "Tests  143 passed (143)" |
| R4 | The same files with `--pool=threads`, head code | 35.77 / 35.63 | "× a very long closed fence > one spread call over 200,002 arguments still overflows the stack in this test process", "× a source whose class holds 130,000 items > one spread call over 130,002 arguments still overflows the stack in this test process", "AssertionError: expected function to throw an error, but it didn't" twice, "Tests  2 failed \| 141 passed (143)". This equals `canary-threads-pool.txt` |
| R5 | Both base production files restored (`git show 8d5d4bab:`), all four test files with `--pool=threads` | 22.04 / 21.80 | The same two "×" canary lines and nothing else: "Test Files  2 failed \| 2 passed (4)", "Tests  2 failed \| 264 passed (266)". Under a 4 MB stack the old lines pass every size test, and only the canaries go red (N1) |
| R6 | `tools/canary-margin.test.ts.txt`: five bisections of the largest surviving `sink.push(...new Array(n))` at a test body's depth | 34.73 / 35.16 | default pool `"largestSurviving":[125399,125399,125399,125399,125399]`; `--pool=threads` `[499100,499100,499100,499100,499100]` |
| R7 | The lane's `spread-mutants.py` at `45f7d855` (`<clone> 45f7d855… 8d5d4bab /tmp/r555b-3 <out>`) | 34.66 / 36.62 | "CONTROL {'mask': (54, 0), 'extractor': (89, 0), 'reader': (90, 0), 'model': (33, 0)}"; MU1 to MU6 "killed"; `{"codeCommit": "45f7d85571f2d216313a2ee399b9d091c37a9e68", … "controlFailing": 0, "mutants": 6, "killed": 6, "survived": [], "baseFailingTests": 20}`, exit 0. Every row's detectors, failing-test set, fragments and mutated-file sha256 equal the lane's `spread-mutants-output.json` row (8 of 8 rows `True` on all four) |
| R8 | The failure messages behind R7, read from the vitest JSON reports the tool leaves in its tmpdir (`lane-mutants-head-messages.json`) | – | Control 0. MU1 "18 x RangeError: Maximum call stack size exceeded"; MU2 "2 x RangeError: …"; BASE "20 x RangeError: …". MU3, 25 failures, MU4, 24, MU5, 7, and MU6, 9, are all `AssertionError` on values, for example MU3 "AssertionError: the masked text differs from every non-terminator byte blanked: expected false to be true" and MU4 "expected [ …(129997) ] to have a length of 130000 but got 129999". **0 timeouts in any row** |
| R9 | My `tools/mutants.py` (round 1's runner plus R9 to R12 and `--test-from`), at `45f7d855`, default timeouts | 21.11 / 27.32 | CONTROL 266 tests, 0 failing. R5 killed (6), R6 killed (2), R8 killed (1), R9 killed (1), R12 killed (3), and **R10 SURVIVED, R11 SURVIVED** (F1). 0 timeouts |
| R10 | R9 with the extraction test file taken from `241b28ff` (round 1's version) | 25.51 / 24.40 | CONTROL 265, 0 failing; "R9-extractor-swaps-at-global-index SURVIVED". N9's whole-slice check is what kills R9 at the head |
| R11 | F1's proposed assertion (`tools/order-assertion.patch`, a scratch commit in my clone, then reset) with mutants L6, R9, R10 and R11 | 22.55 / 22.88 | CONTROL 266, 0 failing; all four killed, each by "AssertionError: the success-criterion items are not in line order: expected false to be true" |
| R12 | `build-record.py <worktree> 0f0ce073046adc10c2eebe35e9867b67ec3f9e49 8d5d4bab d7ffa0148cbfbc804e65ba748ef3ef478daf4e81` in the `45f7d855` worktree | – | exit 0; sha256 of `spread-loops-2026-10-28.json` was `aa30f85d8f4c675bedb7b54580e0a23cf8506568250ec6ecfe70fe827383a7a9` before and after; `git status --porcelain` empty. Its `files` map: "disk 23 listed 23 onlyDisk [] onlyListed [] mismatch []". There are 24 files in the directory, the record itself excluded by design |
| R13 | `huge-differential-selftest.mjs`, with **relative** `<base dist>`, `<head dist>` and `<node_modules>` | 20.95 / 30.23 | `{'killed': 6, 'total': 6}`, S1 to S6 `True`, each exit 1 with its expected failure prefix. The ids and kill states equal the retained output |
| R14 | `ceiling-probe.test.ts.txt` (retained), copied to `src/zz-ceiling-probe.test.ts` at `45f7d855`, run alone, then removed | 19.90 / 21.46 | `CEILING {"kind":"observed","shapeJsonBytes":227519062,"shapeJsonLength":227519050,"items":130018,"limits":{"human":2097152,"machine":16777216}}` |
| R15 | `tools/bytes-check.mjs` over the model test's VISION at `45f7d855` | – | `{"bullets":130000,"utf16Length":520268,"utf8Bytes":520272}` and `{"bullets":200000,"utf16Length":800268,"utf8Bytes":800272}` |
| R16 | Round 1's retained `rev-555/tools/order-check.mjs` over the head `dist` | – | `"items":200006,…,"wholeArrayEqualsClassConcatenation":true,"successLinesStrictlyIncreasing":true`, exit 0. The production loop keeps order; F1 concerns the test only |
| R17 | `tools/exact-texts.py` over the round-1 raw, the frozen body and `45f7d855` | – | "items 23 bad 0" (section 5) |
| R18 | `tools/callback-compare.mjs`: every `it`/`it.each` call in the four test files at `8d5d4bab` against `45f7d855`, resolving an `it.each` table at any enclosing scope | – | reader 39 → 42 calls, mask 30 → 34, extraction 42 → 44, model 29 → 31. Over the 140 common calls: callbacks changed `[]`, tables changed `[]`, options changed `[]`, and no base call is missing. After dedent, `const ENDS:` and `function readOne(` are byte-identical across the move (`True`), one occurrence each at both commits |
| R19 | `PROJECT-STATUS.md` battery, round 1's `battery.py` (one bash script) in the dist-free clone at `45f7d855` | 22.44 / 18.76 | "commands 114 assignments 2 nonzero 0", every command reported an exit status, tree clean after |
| R20 | `npm run typecheck` at `45f7d855` | 18.68 / 19.72 | exit 0, 0 `error TS` |

## 4. Findings

### F1 (blocking): the 130,000-item extractor test claims class order, but its order oracle is the module under test

**Evidence.** `project-shape-extraction.test.ts:1147` is titled `'is extracted, every item kept in class order'`. Its only order
check, `:1153-1160`, compares each class's slice of the three-class result with
`extractSource({ …, extractionClasses: [cls] }, long)`. That one-class call runs through the same
`for (const item of result.items) all.push(item)` loop that the PR changes. So any fault that the loop applies to a class
regardless of the other classes appears identically on both sides. The comparison then holds, and so do the length checks.

[Observed] R9: two mutants survive all 266 tests of the four files.
- **R11** blanks nothing and drops nothing, and it is a natural alternative fix: a chunked spread that appends its chunks in the
  wrong order. Its text is
  `for (let at = Math.floor((result.items.length - 1) / 50_000) * 50_000; at >= 0; at -= 50_000) all.push(...result.items.slice(at, at + 50_000));`.
  It is identical to the loop for any class of 50,000 items or fewer, so every existing fixture passes it. The new 130,000-item
  test is the only test that can see it, and it does not.
- **R10** is a size-gated reversal (`result.items.length > 100_000`). It is more contrived, but it survives for the same reason.

The model test `a 130,000-item success list is extracted whole` checks a count only. The round-1 mutants that reverse
(L5/MU5 and L6/MU6) are killed only by existing small-fixture tests, so nothing pins order past 50,000 items. The production
loop itself keeps order (R16). The fault is the test's.

N9's whole-slice check does add strength, against a fault that depends on state across classes: R9 swaps two items at a global
index of the result array. It is killed at the head by "success-criterion items differ from its one-class result" (R9) and
survives with round 1's test file (R10). It cannot add per-class order, because both sides of the comparison come from the code
under test. This is bar `:64-67`, "Expected values are literals or independently derived".

**Failure scenario.** A later change replaces the loop with a chunked spread, the fix that `syzygy-bpyt.54`'s 31 other sites
invite, and gets the chunk order wrong. Every test passes, while every class past one chunk is stored and rendered in scrambled
line order. The test named "every item kept in class order" stays green.

**Exact fix** [verified, R11]. In `packages/three-surface-poc-core/src/project-shape-extraction.test.ts`, replace

```ts
    expect(r.denominators['success-criterion']).toBe(BULLETS);
    expect(r.items).toHaveLength(
```

with

```ts
    expect(r.denominators['success-criterion']).toBe(BULLETS);
    // Class order with the text as the oracle, not the module: the bullets sit on consecutive lines, so their items must too.
    const success = r.items.filter((item) => item.class === 'success-criterion');
    const first = success[0]?.line ?? 0;
    expect(success.every((item, at) => item.line === first + at), 'the success-criterion items are not in line order').toBe(true);
    expect(r.items).toHaveLength(
```

(the same text is `tools/order-assertion.patch`, sha256 `ebb279ecba49bae6dd0570bf98704b34431f165cf22877690d0536c1908fa6d4`, with
0 U+00A0). With it the control passes, 266 tests with 0 failing, and L6, R9, R10 and R11 are all killed by "the
success-criterion items are not in line order". The test count is unchanged. After applying it:
1. re-run `spread-mutants.py` at the new head;
2. re-run `test-delta.py` and `build-record.py`, passing the new commit as `<tests commit>`;
3. replace the body's "Record sha256" and the rule-6 commit in the body's "Rule 6" and "Review round 1" sections.

### F2 (blocking; low substance, false sentences): the record says the control ran at the code commit, and the body says the repair changed "code"

**Evidence.**
- [Observed] `build-record.py:100` types the claim "Rule 6: … restoring both spreads fails 20 of the new tests; the control run
  at the code commit fails none." It is rendered at `spread-loops-2026-10-28.json:94`.
- In the same record, `subject.codeCommit` is `0f0ce073046adc10c2eebe35e9867b67ec3f9e49` (`:17`) and `subject.testsCommit` is
  `d7ffa0148cbfbc804e65ba748ef3ef478daf4e81` (`:18`). The rule-6 summary copied from the tool says
  `"codeCommit": "d7ffa0148cbfbc804e65ba748ef3ef478daf4e81"` (`:703`), and every `ranAt` in `spread-mutants-output.json` is
  `d7ffa014…`.
- The builder's own docstring (`:5-6`) says the tests commit "is the commit the review-round-1 test edits and the mutants ran
  at".
- The control in the record ran over the d7ffa014 test files. Its detector totals are 54 + 89 + 90 + 33 = 266 tests. At
  `0f0ce073` the four files hold 264 tests, and their sha256s differ (`codeSha256` against `testsCommitSha256` in `subject.files`).
  The sentence names the wrong commit. A reader who re-runs "the control at the code commit", as rule 11 invites, gets different
  detector counts.
- The PR body's "Review round 1" section says "Repaired in `b6ab0a2a` (code, tests, `AGENTS.md`, tools)". `git show --stat
  b6ab0a2a` lists `AGENTS.md`, `build-record.py`, `ceiling-head-0f0ce073.json`, `ceiling-probe.test.ts.txt`,
  `huge-differential-selftest.mjs` and the four test files, so no production file. "code", listed apart from tests and tools,
  reads as production code. That contradicts the body's own, true, "Production bytes of the two files are identical".

**Exact fix.**
1. `build-record.py:100`: replace `the control run at the code commit fails none.` with `the control run at the tests commit
   (the code commit's production bytes with the reviewed test files) fails none.`
2. PR body: replace `Repaired in \`b6ab0a2a\` (code, tests, \`AGENTS.md\`, tools)` with `Repaired in \`b6ab0a2a\` (tests,
   \`AGENTS.md\`, evidence tools and the ceiling figure; no production byte)`.
3. Re-run `build-record.py`, which F1's last step does anyway, and replace the body's "Record sha256".

### N1 (note, low): the reader and model test files carry no canary

[Observed] R5: with both base lines restored and `--pool=threads`, `git-object-reader.test.ts` and `project-shape-model.test.ts`
pass whole. Only the two canaries, in the mask and extraction files, fail. A full-suite or four-file run therefore still goes red
by name, which is what N1 of round 1 asked for. A targeted run of either of those two files alone under a larger stack gives no
signal, and the reader file carries the most new tests (9).

Optional fix: add the mask canary's three lines inside `describe('a 200,000-line closed fence under the read limit (GP-B2 Q1)'`,
using `LONG_LINES + 2`, and inside the model file's `describe('a very long fence or list does not abort the observation'`, using
`200_002`.

### N2 (note, low): the record's `subject.files` test rows mix commits without saying so

[Observed] For each test file, `build-record.py:38-43` takes `added`/`removed` from `base..testsCommit` but `codeSha256` from the
code commit. For example, the `git-object-reader.test.ts` row is `"codeSha256": "0a906f2c…"` (`0f0ce073`), `"added": 44,
"removed": 12` (`d7ffa014`), `"testsCommitSha256": "216d343d…"`. Only the builder's docstring says this, not the record.

Fix: in `build-record.py:41`, add `'countsAt': tests_commit if is_test else code` to each `files[p]` row, so the record names the
commit of every figure (rule 11).

### N3 (note, information): `~6` counts no changed test

[Observed] R18: over the 140 calls present at both commits, no callback, `it.each` table (resolved at any scope) or option argument
changed. `ENDS` and `readOne` are byte-identical after dedent. The six come from
`docs/evidence/syzygy-bpyt-16/test-inventory.mjs:13`, which resolves a table identifier only among file-scope statements. Before
the hoist, the table text was `ENDS`; after it, the text is `ENDS = [[…]]`. The lane's explanation, in the body and in
`tests.changedNote`, is true.

Optional follow-up: let `test-inventory.mjs` resolve a table at any enclosing scope, as `tools/callback-compare.mjs` does, so that
the line reads `~0` for a pure move.

### N4 (note, information): the extractor canary's margin is 3.7%

[Observed] R6: at a test body's depth in a vitest fork, one spread call survives 125,399 arguments, five of five bisections
identical. The extractor canary spreads 130,002, a margin of 4,603. The mask canary spreads 200,002, a margin of 74,603. The
boundary depends on the stack size and depth, not on load. R1, R3, R7 and R9 were green at load averages of 16 to 42, so the
canary is not flaky. A runtime that gives a test about 4% more stack makes the extractor canary fail. At that point the
130,000-item size test, whose spread sits deeper, is about to stop pinning MU2 anyway. So the canary fails at about the right
point, and loudly. No change is needed. I record the margin so that a future canary failure is read as a stack change and not as
a flake.

## 5. Verdicts on each round-1 item and each deviation

Exact-text check (R17, `tools/exact-texts.py`). Each text was cut from the round-1 raw by regex, never retyped. Each was then
searched for in `git show 45f7d855:<file>` or in the frozen body, both as is and with `//` comment markers removed and whitespace
folded. 23 items, 0 bad, 0 U+00A0 in any extracted text.

| Item | Verdict | Evidence |
|---|---|---|
| F1 step 1 (body table row) | **Met** | new text exact in the body; old text absent |
| F1 step 2 (body item 2) | **Met** | exact; old absent |
| F1 step 3 (`build-record.py:91`, now `:97`) | **Met** | exact; old absent |
| F1 step 4 (ceiling JSON and retained probe) | **Met** | JSON exact. `ceiling-probe.test.ts.txt` is byte-identical to round 1's tool (`753d2b66b890e003e50a31a4df0a163849831c662cad00ce5d0d090952827bfe`, `cmp` identical) and is listed in `files`. Re-run R14: 227,519,062 bytes and 227,519,050 code units |
| F1 step 5 (docstring) | **Met** | matches after whitespace folding (the line was re-wrapped); old absent |
| F1 step 6 (re-run, body sha256) | **Met** | R12: `aa30f85d…` regenerated, equal to the body. My own figures (R14, R15) are 520,272, 800,272 and 227,519,062 bytes, and 520,268, 800,268 and 227,519,050 UTF-16 code units, all as published |
| N1 canaries | **Met** | text exact at `markdown-code-context.test.ts:245-250`. The extraction copy has `BULLETS` and 130,002, as N1 allowed. R3 passes, and R4 and R5 fail by name under threads |
| N2 three comments | **Met** | mask comment and both model replacements match after folding; the third item was "No change" |
| N3 `AGENTS.md` bullet | **Met** | exact at `AGENTS.md:277-283`. R6's ×3.98 in a worker (499,100 against 125,399) bears out "four times it in a worker thread" |
| N4 assertion messages | **Met** | both exact. The mask message appears in R8's MU3 failures |
| N5 own describe | **Met** | describe title exact at `git-object-reader.test.ts:462` |
| N6 selftest paths | **Met** | both `resolve(...)` texts exact; R13 with relative paths gives 6 of 6 |
| N7 owner notice | Not judged in these bytes (coordinator's) | The body says so ("N7 … is the coordinator's") |
| N8 timeouts | **Met** | `}, 30_000);` on both 130,000-item tests. R1 took 1,064 ms and 1,976 ms at load 16-42 |
| N9 whole slice | **Met as written** | text exact at `project-shape-extraction.test.ts:1160`. It kills R9, which round 1's three-at-each-end check misses (R10). R5, R6 and R8 are killed by the length assertions, not by the slice. Its per-class order limit is F1. The unclosed-fence comment is present and true: those tests pass at the base (round 1 R3), and the loop is never reached |

**Deviation 1, `ENDS` and `readOne` hoisted to file scope: accepted.** N5's own text permits it ("declaring `ENDS` there if it is
not at file scope"). Both describes need both names. The moved text is byte-identical after dedent, each name occurs once in the
file, and no test callback changed (R18).

**Deviation 2, the `~6`: the explanation is true** (N3). No test body, table or option changed.

**Deviation 3, the mutants ran at `d7ffa014`: harmless to the result, misdescribed in one record sentence.** The six files the
mutants read are byte-identical at `d7ffa014` and `45f7d855`. My re-run at the head reproduces all 8 rows exactly, with 0 timeouts
(R7, R8). One sentence in the record says "at the code commit" (F2).

**PR body, sentence by sentence against my runs.** I checked every figure in the body against R1-R20 or against round 1's runs of
files unchanged since `241b28ff`:
- `huge-differential-{default,stack-size-492,stack-size-1968}.json`, `mask-differential-output.json` and both sweep JSONs: `git
  diff --stat 241b28ff 45f7d855` does not list them;
- the full-suite counts (R1); the battery (R19); the typecheck (R20); the record sha256 (R12); the test counts (R7 control 266;
  the base's 241 from round 1);
- the canary sentence (R4, R5); the four-times figure (R6); "6 of 6 killed" from relative paths (R13).

All are true. The only false sentence is the "(code, …)" parenthetical (F2). One more is true but would mislead without context:
"Control at `d7ffa014` …: 0 failures in 266 tests". It names the commit correctly. The record's sentence is the one that does not.

## 6. Test quality

- **Regression pins** (bar `:58-59`) [Observed]: R7's BASE row fails 20 of the 25 new tests, all by `RangeError`. The 5 that pass
  at the base are the 3 unclosed-fence guards and the 2 canaries. The canaries test the process, not the code, by design.
- **Rule 6 at the head** (rule 6): every lane mutant is killed by a value assertion or a `RangeError`, never a timeout (R8).
  Round 1's R5, R6 and R8 are killed by length assertions (R9). The size-dependent order faults R10 and R11 survive (F1), and F1's
  assertion kills them (R11).
- **Determinism** (bar `:78-81`): the head's loops do not depend on the stack. The canaries do, by design, and the boundary they
  probe was identical across five bisections (R6). Every run here was green at load averages of 16 to 42.
- **Failure messages** (bar `:82-84`): N4's messages appear verbatim in the failures (R8). F1's assertion carries its own message.
- **Oracle independence** (bar `:64-67`): F1.
- **Net delta** (bar `:93-96`): +25 ~0 -0 in substance (+25 ~6 -0 as the inventory counts, N3), 241 → 266 over four files.
  Placement was repaired by N5. F1's fix adds no test.

## 7. Cleanup

**Deleted:**
- the scratch clone (at `45f7d855`, later locally merged with `c672492c`) and its two worktrees (`45f7d855` and `8d5d4bab`), with
  their builds;
- the per-file copies under `cmp-8d5d4bab/` and `cmp-45f7d855/`;
- my TMPDIRs `/tmp/r555b-1` to `/tmp/r555b-6`. I created all six, and `ls -d /tmp/r555b-*` now finds none;
- the vitest JSON (2.2 MB; its counts and the 25 durations are in `full-suite-summary.json`), the vitest, `npm ci`, battery,
  typecheck, selftest and lane-mutant logs, the battery's per-command JSON, the load-average files (quoted in section 3) and the
  PR body copy.

The two scratch probe test files (`zz-canary-margin.test.ts`, `zz-ceiling-probe.test.ts`) and the base-file restore were removed
after each run, and `git status --porcelain` was empty after each. My scratch commit for F1's patch was discarded by checking out
`45f7d855`. No process from my tree is left running. I made no PR comment, push, merge, workflow dispatch or `bd` mutation.

**Kept** under `rev-555-r2/` (sha256 computed after the last write; none is over 300 KB):

| File | sha256 |
|---|---|
| `callback-compare.json` | `9d8421c045ca15c6c9250bbb71a4bbdb6b0cd224d6705c10af9f0b94451ac2bc` |
| `full-suite-summary.json` | `8ae5094279164d28f2e3da82778f57bd55dfb3f335fad18d1315a5f72989878d` |
| `lane-mutants-head-messages.json` | `b182161ea16ae9191327ac6139d680b954ac080daaa05ae502dba5eafa27291b` |
| `lane-mutants-head.json` | `1e70a8f18d1896cf18870b8cf3d93351674c660e29f2184eb75f8a6580eaa412` |
| `own-mutants-head.json` | `c7777fd81a2a51414bc2189d8df63de14b50f2f12f92757d1b3aceb41cee3bc4` |
| `own-mutants-r1-extraction-test.json` | `b93477631d577086bc4bfdf77ebede4214543cc897e41a582f306240dc16de3f` |
| `own-mutants-with-order-assertion.json` | `9d341e44cc6e251eab311d5f31fad09829db3d57199144b35182e1bd5f0f72d5` |
| `selftest-relative.json` | `bb060b81780f21ceea88ddf9bb19a60114ddc11d841b3f9e03168a085f6b3191` |
| `tools/battery.py` | `f41fae257e543c630543b211f3edfcb715ced51a4f4a24fb788877fc0c0f43c2` |
| `tools/bytes-check.mjs` | `81d0f03f392ef79cc12166b762432247d1fbc9ee8621d2d7d8b2cdca1b0c6917` |
| `tools/callback-compare.mjs` | `8d16d0ebdd311f7c6f58f9f445af8cb1f4c30ffaa1871cba38ce830cb77e0776` |
| `tools/canary-margin.test.ts.txt` | `a5686ac340b4eeb9fb41c75474c346c2c41c963c641b9a58ddcd2970e46b1e7d` |
| `tools/exact-texts.py` | `d02688125920c740d2e204549d9576c6a4b32dcd0ff8a79e3f296396bb309d36` |
| `tools/mutants.py` | `79b98405325eaaf52c17c6c73162bb8ae3c719301e121891a45d5c94ffef8662` |
| `tools/order-assertion.patch` | `ebb279ecba49bae6dd0570bf98704b34431f165cf22877690d0536c1908fa6d4` |

What each file is:
- `battery.py` and `bytes-check.mjs` are round 1's tools, copied unchanged (the sha256s equal round 1's table).
- `mutants.py` is round 1's runner, extended with R9 to R12 and `--test-from`; the docstring says so.
- `order-check.mjs` was run from round 1's retained copy (`rev-555/tools/`, `66b59450…`) and is not duplicated here.
- Every result file is named by its run in section 3.
