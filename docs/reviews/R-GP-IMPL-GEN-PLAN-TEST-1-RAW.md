# R-GP-IMPL-GEN-PLAN-TEST-1 — CC-REV-1 implementation review of syzygy-vsqr, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 02eb444f
Subject: r1-review.diff sha256 fcb2d8331a00639815896ba70357cf448ca3ccef4f6e5e88b9ad4e2d8ce63aee

Reviewer: an independent, fresh-context reviewer (did not author the change; worked from the brief, the subject diff, the
bead, the PR body and the governing references only). Date: 2026-10-28 (host clock; runs below are stamped UTC).
Every run was in a private scratch clone of `/home/tze/GitHub/syzygy` under `rev-546/`, with its own TMPDIR. No target
repository content was read. Nothing was pushed, commented, merged, dispatched or written to `bd`.

## 1. Subject identity checks

All [Observed], by script, in the scratch clone (`git fetch` of `agent/syzygy-vsqr` and `main` from GitHub).

| Check | Expected | Result |
|---|---|---|
| `sha256sum r1-review.diff` | `fcb2d833…aee` | `fcb2d8331a00639815896ba70357cf448ca3ccef4f6e5e88b9ad4e2d8ce63aee` — **match** |
| `git diff 81862261 02eb444f \| sha256sum` | `fcb2d833…aee` | `fcb2d8331a00639815896ba70357cf448ca3ccef4f6e5e88b9ad4e2d8ce63aee` — **match** |
| `cmp <(git diff 81862261 02eb444f) r1-review.diff` | identical | `IDENTICAL` |
| `git diff 81862261 02eb444f -- apps \| sha256sum` | `3c6f435f…a55` | `3c6f435fdffc8b57913ea0a26dea885319be5415f5a155f0fa73f3efd2d69a55` — **match** |
| `git diff --stat` | 4 files, +860/−16 | `4 files changed, 860 insertions(+), 16 deletions(-)` |
| PR head (`gh pr view 546 … headRefOid`, `git ls-remote`) | `02eb444f` | `02eb444f22a673748567620c5f0d45877a27f2ff` |
| merge base with GitHub `main` | `81862261` | `81862261ddbc2b3c8e8481851f3c27129217d477` |
| commits in the PR | — | `b5307ee1` (test + comment + tool), `02eb444f` (adds `test-mutants.json` only: `git diff --stat b5307ee1 02eb444f` = 1 file, +608) |

**Main movement.** `git ls-remote https://github.com/Tzeusy/syzygy.git refs/heads/main` returned
`81862261ddbc2b3c8e8481851f3c27129217d477` at the start, after the full suite, and again just before this raw was written;
`gh pr view 532` returned `OPEN`. So main changed **0** paths since `81862261` (`git diff --name-only 81862261 gh/main | wc -l`
→ `0`), and the PR paths that main changed are **none**. [Observed] The local merge (`git merge --no-ff 02eb444f` onto
`gh/main`) has tree `5fb8361c4a529dc3e4585772dae24bec9d15afda`, equal to `02eb444f^{tree}`; the plan test on it:
`Test Files  1 passed (1)`, `Tests  13 passed (13)` (load1 27.04 → 26.55).

**Hosted CI at `02eb444f`** [Observed], `gh pr checks 546` (second read, after `checks` finished):
`checks	pass	24m32s	…/runs/40545619984/…` and `node	pass	4m22s	…/runs/40545620180/…`. Both runs have
`head_sha` `02eb444f22a673748567620c5f0d45877a27f2ff`, event `pull_request`, conclusion `success`. The node log
(`node-run-excerpt.txt`) shows `HEAD is now at f779d92a Merge 02eb444f… into 81862261…`,
`generation-mutation.test.ts (13 tests) 748ms`, `Tests  5518 passed | 5 skipped (5523)` and, for `test:system`,
`Tests  49 passed (49)`.

**Evidence-record identity** [Observed]. `test-mutants.json` names commit `b5307ee10e4ccc9f0ad4bd7a5c42ea6ad5cb6f31`, tool
sha256 `99fbcca0…` (equal to `sha256(docs/evidence/syzygy-vsqr/test_mutants.py)` at `02eb444f`), and four file digests.
Each of the four equals that file's bytes at **both** `b5307ee1` and `02eb444f` (`git show <c>:<f> | sha256sum`):
runner `24bf40d8…`, test `4c4001eb…`, plan `5f9b848c…`, `pipeline.ts` `89df8156…`. So the test bytes the tool ran against
at `b5307ee1` are byte-equal to the reviewed ones, and my re-run at `02eb444f` (§3.3) reproduces the record.

## 2. Clauses relied on (quoted), and the class ruling

**CC-REV-1**, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md`:
- :31-43, the seven classes: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization
  (VIS-5, VIS-6); 2. **graph identity** …; 3. **deterministic observation** — snapshot composition, evaluation identity,
  the deterministic/inferred seam (VIS-7); 4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;
  5. **data migration** …; 6. **public interface** — machine-queryable endpoints, adapter contracts, anything an
  external consumer can depend on; 7. **certificate logic** …".
- :45-46: "**Class membership is contested by default and is never finally determined by the agent performing the
  change**".
- :49-50: "**The change record states** which classes the change touches, or "none," so a misclassification is a findable
  violation after the fact."
- :51: "**A reviewer or the owner** may reclassify at any time."

**GP-Q0**, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`:
- :52-55: ""Behavior-preserving" means none of the following changes: - a rendered byte, a wire format, a refusal string
  or an exit code; - a signed or digest-bound artifact; - a consent, security or retention decision."
- :60: "Each pull request states which CC-REV-1 classes it touches. Any pull request whose classes are not "none" gets the
  CC-REV-1 independent review, from a fresh-context reviewer on the default model."

**AGENTS.md** at `02eb444f` (unchanged by the PR):
- rule 6 (:126-127): "Mutate the input and confirm the check fails, per predicate, before trusting it";
- rule 10 (:133): "Freeze the bytes a review is bound to; any later edit retires the review.";
- rule 11 (:134-135): "An evidence record names its subject and the subject's digest";
- :290-291: "A mutation that throws at describe time reports zero tests and scores as survived — build fixtures in
  `beforeAll`.";
- :292-294: "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it ran at; ids and
  outcomes alone are not re-runnable, and a rebase-merge leaves the recorded commit reachable from no ref.";
- :327-329: "Copy-oracle tests match by substring: a very short label (`None`) is "reached" by coincidence and proves
  nothing — give every label a distinctive string or drop it."

**Test-rigor bar**, `git show 02eb444f:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`:
- :42-43: "**A test is worth keeping only if some plausible bug makes it fail.**";
- :82-84 (bar 7): "**A failure names the defect** — Test names state expected behavior ("rejects_expired_token");
  assertion messages make the diff readable. A maintainer should localize the bug from failure output alone.";
- :93-97 (bar 10): "**Growth is governed** — A test is worth *adding* only if it catches a plausible bug no existing test
  catches: search for the nearest existing test first and prefer extending it. Reviews state the net test delta;
  adds-only growth in a mature area is a finding".
  (`references/suite-discipline.md`, which bar 10 links, is not tracked at `02eb444f`: `fatal: path … does not exist`.)

**Class ruling: none.** [Observed for the facts, Inferred for the ruling.]
- The diff touches one test file, one comment in the plan module, and two evidence files (§5). The plan module's emit
  with comments removed is byte-equal at base and head (`6c72c0be…` both), so no plan data or code changed.
- None of the seven classes is reached: the test reads repository files and TypeScript's compiler API; it mints no
  identity, composes no snapshot, crosses no authority or egress boundary, migrates nothing and exposes no interface.
- Under GP-Q0 :52-55: no product rendered byte, wire format, refusal string or exit code changes; no product code
  changes at all. Digest binding: the base digests of the test (`64f2b42f…`) and plan (`45df0eb0…`) appear in **0** and
  **2** of 6,818 tracked files at `02eb444f`; the two are evidence records of earlier reviews
  (`docs/evidence/syzygy-kpbq/plan-test-mutants.json`, `docs/evidence/gen-mutation-plan-review-2026-10-27/r1/plan-test-mutants-r543.json`),
  which describe the bytes at their own commit (rule 11), not act manifests. The plan path appears in one `.syzygy/**`
  file, a `STATIC-TRACE.json` path population with no digest of it.
- **What a gate accepts or refuses.** The scheduled mutation gate's pass/fail rule is the runner's
  `return survived === 0 && restoreFailures === 0 ? 0 : 1;` (`generation-mutation-run-main.ts:187`) and its workflow
  runs only `npm run poc:generation-mutation-run`; both are byte-unchanged (runner `24bf40d8…`, workflow `26b6eb14…` at
  base and head). The plan test is not among the runner's `TEST_FILES`. **No product gate and not the scheduled gate's
  rule changes.** What does change is what node-ci's `npm test` step refuses: more plan shapes, and — new in kind — a
  rename of any of the 13 must-fail titles in the four generation-core test files (N8). That is the expected effect of
  a stricter plan test, not a gate change in the brief's sense.

## 3. What I ran, and the results

Load is `/proc/loadavg` (load1 load5 load15) before → after each run. All runs at `02eb444f` unless stated.

### 3.1 Scope (`tools/scope_check.py` → `scope-check.txt`)
- `changed paths 81862261..02eb444f: 4` — `M generation-mutation.test.ts`, `M generation-mutation.ts`,
  `A docs/evidence/syzygy-vsqr/test-mutants.json`, `A docs/evidence/syzygy-vsqr/test_mutants.py`.
- `runner changed: False`; `gate workflow changed: False`; `paths under packages/polaris-generation-core/src/: 0 []`;
  second method `git diff --name-only … -- <those paths>`: `0 []`.
- `plan raw bytes equal: False`; `plan emit (removeComments) equal: True` (both `6c72c0be…5374`); `plan changed lines: 4`,
  all four comment lines (`-// Hand-listed semantic mutations, three per subject file, …` → `+// Hand-listed semantic
  mutations, grouped by the file they target, each`).

### 3.2 Title census of the four runner test files (`tools/title_census.cjs` → `title-census.jsonl`)
Compiler-API sweep of every call whose callee chain starts at `it`, `test` or `describe` (any property chain, tagged
templates included), 78 calls: `60 ('it', StringLiteral, captured)`, `6 ('it.each(...)', StringLiteral, captured)`,
`6 ('describe', StringLiteral, not captured)`, and the 6 inner `it.each(table)` calls (5 `ArrayLiteralExpression`, 1
`AsExpression`) that carry tables, not titles. Second method, Python regex over the raw text:
`{'describe(': 6, 'it(': 60, 'it.each(': 6} 72`. [Observed] So today the four files use exactly three forms: `it('…')`,
`it.each([...])('…')` and `describe('…')`. **No** `test`, `it.skip`, `it.only`, `it.concurrent`, `it.todo`, tagged
`each` tables, `$id` templates, template-literal or concatenated titles. The reader captures all **66 of 66** test
titles. Four of the six `each` templates carry `%s` (the `it.each` calls at `parse-json.test.ts:16`, `:21`, `:25` and
`pipeline.test.ts:270`, `'deadline bounds a stalled %s adapter'`); none uses `$`.

### 3.3 The PR's own rule-6 tool, re-run at the reviewed commit
`TMPDIR=/tmp/r546-3 python3 -I docs/evidence/syzygy-vsqr/test_mutants.py ../test-mutants-at-02eb444f.json`
(load 49.65 → 49.47): `control passed; {'mutants': 19, 'asExpected': 19, 'killed': 18, 'restored': 19}; tree clean True`,
exit 0. Against the committed record: tool sha equal, file digests equal, summary equal, **0 of 19** rows differ in
outcome, `asExpected` or failed-test count; failure messages differ only in R6, whose ENOENT path names the clone.
`tools/compare_edits.py` (→ `compare-edits.txt`): R1, R2, R4, R5, R6, R7, R8 `equal` to the reviewer's
`own_test_mutants.py`; R3 `DIFFERENT` (disclosed: adapted to the `it.each` table); T1-T7 `equal` to
`docs/evidence/syzygy-kpbq/plan_test_mutants.py`.

### 3.4 The PR #543 reviewer's four survivors, byte for byte (`tools/reviewer_survivors.py` → `reviewer-survivors.json`)
The edits are loaded from the reviewer's tool (`own_test_mutants.py`, sha256 `d2424e20…f870f`) by path, never retyped,
and each run uses that tool's own `run_test`. (Its `main` cannot run as is: its R3 asserts on the old `for` loop, which
the reviewed test no longer has, and the assertion would abort the loop before R4.) Load 42.11 → 44.35.

| Id | Outcome | Failed/total | Failure message (first line, verbatim) |
|---|---|---|---|
| R1 | **killed** | 1/13 | `AssertionError: pipeline-max-calls-disabled: the mutation changes the emitted JavaScript: expected 'import { quotableGenerationSources, v…' not to be 'import { quotableGenerationSources, v…' // Object.is equality` |
| R2 | **killed** | 1/13 | `AssertionError: provider-draft-duplicate-handle-check-disabled: apps/three-surface-poc/src/polaris-generation/generation-mutation.ts is a non-test file under packages/polaris-generation-core/src/: expected false to be true // Object.is equality` |
| R4 | **killed** | 1/13 | `AssertionError: parse-json-pollution-key-check-disabled: must-fail "rejects pollution keyz" is in a test title: expected false to be true // Object.is equality` |
| R5 | **killed** | 1/13 | `AssertionError: pipeline-max-calls-disabled: the mutation changes the emitted JavaScript: expected 'import { quotableGenerationSources, v…' not to be 'import { quotableGenerationSources, v…' // Object.is equality` |

`{'mutants': 4, 'killed': 4, 'restored': 4}; tree clean True`. Each failure names the mutation id and the check that
refused it. The emit messages print two identical 40-character prefixes, so the id and the label carry the meaning.

### 3.5 My own mutants (`tools/own_mutants.py` → `own-mutants.json`, `own-mutants-run.log`)
24 mutants, each with a prediction written before the run; control `13/13` passed; load 25.43 → 27.47.
`{'mutants': 24, 'killed': 11, 'survived': 13, 'matchesPrediction': 24, 'restored': 24}; tree clean True`.
(Q3b was added after a scratch probe and the whole set re-run with the final tool, sha256 `d7a91eb5…`; the earlier
partial records were deleted.) Each edit's `old`/`new` is in the record.

| Id | Aim | Outcome | Real gap? |
|---|---|---|---|
| Q1 | R1: the fragment's only occurrence is inside a string literal (guard rewritten) | survived | No for a literal plan: emit keeps string contents; a guard's text living only in a string is implausible, and the gate would score it SURVIVED |
| Q2 | R1: the same inside a template literal | survived | As Q1 |
| Q3 | R1: inside a `/*!` comment in statement position | **killed** (`… changes the emitted JavaScript`) | — |
| Q3b | R1: inside a **detached `/*!` comment at the head of the file** | **survived** | Real but negligible: `removeComments` keeps a detached `/*!` file-head comment (scratch probe: `/*! detached head */` kept; in-body `/*!`, detached or not, dropped). It falsifies one sentence's universality (N4) |
| Q4 | R1: inside a JSDoc on an exported declaration | **killed** | — |
| Q5 | R5: a `to` that changes only a type assertion (`as readonly string[]`) | **killed** (`canonical-json-sorted-keys-disabled: the mutation changes the emitted JavaScript`) | — |
| Q6 | R5: a `to` that adds redundant parentheses | survived | No: an equivalent mutant with a different emit; no textual check can see it, and the header disclaims it ("Whether the mutated guard is then caught is the gate's own run") |
| Q7 | R5: a `to` that changes only quote style | survived | As Q6 |
| Q8 | R4: a must-fail name matching a `describe` title only | **killed** | — (stricter than the runner) |
| Q9 | R4: a strict substring of a longer title (`'rejects pollution'`) | survived | No: the runner also matches by substring; the name stays distinctive (1 title) |
| Q10 | R4: a title in `island-boundary.test.ts`, which the runner does not run | **killed** | — |
| Q11 | R4: a name carrying the template's literal `%s` | survived | **Yes, small** (N1): the plan test accepts a name the runner can never match |
| Q12 | R4: a name carrying an `each` row's substituted value | **killed** | False refusal relative to the runner (N1) |
| Q13 | R4: a name in vitest's fullName form (describe + title) | **killed** | False refusal relative to the runner and to the plan's own interface comment (N1) |
| Q14 | R4: an empty must-fail name | survived | **Yes, small** (N1): vacuous in both the plan test and the gate |
| Q15 | runner check: a `TEST_FILES` entry commented out | survived | **Yes, small** (N3) |
| Q16 | R2: a `..` path under the prefix that resolves to the plan module | survived | **Yes, small** (N2) |
| Q17 | R2: a `.spec.ts` copy of `draft-model.ts` | survived | Marginal (N2): not a test file under this repo's vitest include (`vitest.config.ts:49`, `'packages/polaris-generation-core/src/**/*.test.ts'`) |
| Q18 | R2: a `.test.tsx` copy | survived | As Q17 |
| Q19 | R2: a `.d.ts` copy | **killed**, but by `Error: Debug Failure. Output generation failed` from `transpileModule`, not by the R2 assertion (N2) | — |
| Q20 | N2: three drifts at once (R4's name, T3's twice-occurring fragment, R2's wrong file) | **killed**, `3/13`, each row by id (below) | — |
| Q21 | robustness: `import ts from 'typescript-missing'` | **killed**, `0/0`, file error `Cannot find package 'typescript-missing' imported from '…/generation-mutation.test.ts'` | — |
| Q22 | check-side: `removeComments` dropped, with R1's `// was:` edit | survived (as predicted) | — shows the option is load-bearing |
| Q23 | check-side: substring title match replaced by equality | **killed**, `2/13` (the two parse-json rows) | — shows substring matching is load-bearing |

Q20's three failures, verbatim:
`AssertionError: parse-json-pollution-key-check-disabled: must-fail "rejects pollution keyz" is in a test title: expected false to be true // Object.is equality`;
`AssertionError: provider-draft-duplicate-handle-check-disabled: apps/three-surface-poc/src/polaris-generation/generation-mutation.ts is a non-test file under packages/polaris-generation-core/src/: expected false to be true // Object.is equality`;
`AssertionError: provider-draft-unknown-source-check-disabled: occurrences of the fragment in packages/polaris-generation-core/src/provider-draft.ts: expected 2 to be 1 // Object.is equality`.

Scratch emit probes (not mutants, same options as the test, through `tools/emit.cjs`): whitespace between tokens
(`if (x)   return x ;`) → emit **equal**; a newline after `return` (ASI) → emit **differs**; an inserted space inside a
string literal → emit **differs**.

### 3.6 Must-fail matching: the plan test against the runner (`tools/mustfail_match.mjs` → `mustfail-match.jsonl`)
Inputs: the census (66 captured titles) and a vitest JSON run of the runner's four files (`four-files.json`,
`107 107 0`, load 37.05 → 37.05). Over all **13** must-fail names of the 12 mutations: every name matches **exactly 1**
reader title and at least 1 vitest `fullName` (1 each, except the two parse-json names, 4 each). So the two matchers
agree on the whole current plan. They differ by construction: the plan test matches `title.includes(name)` over `it`
titles with `each` templates uninstantiated (`generation-mutation.test.ts:80`); the runner matches
`failing.includes(name)` over failing tests' `fullName` (`generation-mutation-run-main.ts:65`, `:137`), which is the
describe title and the test title joined by a space, with `%s` substituted (`'bounded provider JSON parsing rejects
pollution keys: __proto__'`).

### 3.7 Suites and checks
| Run | Load | Result (verbatim) |
|---|---|---|
| plan test alone, `/usr/bin/time -v` | 48.29 → 48.19 | `Tests  13 passed (13)`; `Duration  4.08s (… collect 1.13s, tests 2.03s …)`; wall `0:06.14`, max RSS 231,528 KB |
| `npx vitest list` of the file, base / head | 48.01 | base: 1 name; head: 13 names (`list-base.txt`, `list-head.txt`) |
| `npm run typecheck` | 27.37 → 25.75 | exit 0 |
| full `npx vitest run --reporter=json`, once, 2026-10-27T17:26:53Z–17:31:48Z | 24.12 → 48.92 | exit 0; `numTotalTests 5523, numPassedTests 5518, numFailedTests 0, numPendingTests 5`; 254 files, all `passed`; the plan test `passed 13` (`full-suite-summary.json`) |
| plan test on the local merge with main | 27.04 → 26.55 | `Tests  13 passed (13)` |
| `python3 scripts/check_governance.py` | 44.69 | `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, exit 0 |
| `python3 scripts/check_quotations.py` | — | exit 0 |
| `python3 scripts/check_docs_review_campaign_partition.py` | — | `total=572 assigned=572 raw=538 other=34 unmatched=0 overlaps=0`, exit 0 |

No file failed, so no file needed a lone re-run. The 5 skipped tests are environment-gated (strace, Butlers repo,
real browser), listed in `full-suite-summary.json`.

### 3.8 The N8 window (`gate-runs.tsv`, `gh run list --workflow generation-mutation-gate.yml --limit 100`)
36 runs listed (oldest 2026-09-23). Scheduled: 35, of which **24** failed, first `37196853549` 2026-10-04T10:53:40Z,
last `40486647289` 2026-10-27T10:12:10Z; the 11 scheduled runs before the window all `success`; no scheduled run after
`40486647289` is listed yet. The window 2026-10-04..2026-10-27 holds **25** runs:
`('schedule', 'failure'): 24, ('workflow_dispatch', 'success'): 1` — the dispatch is `40508139318`, branch
`agent/syzygy-kpbq`, 2026-10-27T12:59:12Z. `5955f8c0` (committed 2026-10-04T07:12+08:00) is an ancestor of the first
failing run's head `ac35c998` and not of the last green one's `2546a99d`.

### 3.9 Probe of the proposed follow-up checks (`tools/probe_fix.py`, `probe-fix.diff`, `probe-fix-mutants.json`)
To make N1-N3 actionable cold, I applied the checks proposed there to the test on a **local, unpushed** branch of the
scratch clone (commit `4daf31fe`, deleted afterwards), confirmed `npx tsc --noEmit -p apps/three-surface-poc` exit 0,
and re-ran Q8-Q19 (load 29.12 → 32.20): control `13/13` passed; **Q11, Q14, Q15, Q16, Q17, Q18 and Q19 are killed**,
each by a named assertion (for example `the runner's TEST_FILES: expected [ …(3) ] to deeply equal [ …(4) ]` and
`… draft-model.d.ts is a normalized non-test .ts file under packages/polaris-generation-core/src/: expected false to be
true`); Q9 still survives (a distinctive substring, as the runner allows); Q8, Q10, Q12, Q13 stay killed. The record's
`matchesPrediction` field compares with predictions written for the reviewed test, so its 6/12 is expected.

## 4. Findings

No blocking finding. Eight notes. None changes the reviewed test's verdict on the current plan, and none reaches a
product gate or the scheduled gate's rule.

### N1 — R4's must-fail match and the runner's disagree in four constructed shapes (note; test bytes and a plan comment)
- **Severity:** low. Today all 13 names agree in both matchers (§3.6).
- **Evidence** [Observed, §3.5]:
  - Q11 (`'rejects pollution keys: %s'`) and Q14 (`''`) pass the plan test. The runner can never match Q11, because a
    `fullName` has `%s` substituted. Q14 is vacuous in both: every string includes `''`. AGENTS.md :327-329 names this
    class: "a very short label … is "reached" by coincidence and proves nothing".
  - Q12 (an instantiated `each` name) and Q13 (describe title + test title) fail the plan test, but the runner accepts
    both. The plan's interface says such names are lawful: `generation-mutation.ts:23`, "// Test full names
    (substrings) that MUST be among the failures."
- **Failure scenario.** An author writes the `fullName` they see in vitest's output, as the plan comment invites. The
  plan test refuses it on the PR (Q13). Or the author copies an `each` template with its `%s`: the plan test accepts
  it, and the scheduled gate reports the mutant `SURVIVED` with `mustFailMissing` the next morning (Q11).
- **Proposed fix** (probed in §3.9; it keeps the current plan green):
  ```ts
  for (const name of mutation.mustFail) {
    expect(name.trim() !== '' && !/%|\$/.test(name), `${id}: must-fail "${name}" is a literal title fragment`).toBe(true);
    expect(titles.filter((title) => title.includes(name)).length, `${id}: test titles holding must-fail "${name}"`).toBe(1);
  }
  ```
  Then reword `generation-mutation.ts:23` to "// Substrings of test titles (as the plan test reads them; the runner
  matches them against full names) that MUST be among the failures." Changing the plan comment needs no plan-data
  change, since the emit is unchanged. The alternative is to prefix each reader title with its `describe` ancestors.

### N2 — R2's path check is textual (note; test bytes)
- **Severity:** low.
- **Evidence** [Observed]. Line :74 checks `mutation.file.startsWith(SUBJECT_ROOT) && !mutation.file.endsWith('.test.ts')`.
  - Q16 passes: `packages/polaris-generation-core/src/../../../apps/three-surface-poc/src/polaris-generation/generation-mutation.ts`
    starts with the prefix, and `join` resolves it to the plan module, which holds the fragment once inside a string.
  - Q17 (`.spec.ts`) and Q18 (`.test.tsx`) pass.
  - Q19 (`.d.ts`) is refused, but only because `transpileModule` throws `Debug Failure. Output generation failed`.
  - `workspace-reach.testkit.ts` exists under the prefix and would pass R2 if it held a fragment.
- **Failure scenario.** A plan edit that points at a `..` path, or at a test-support copy, passes on the PR. The
  scheduled gate then mutates a file no runner test imports, and reports `SURVIVED`.
- **Proposed fix** (probed in §3.9):
  ```ts
  const { file } = mutation;
  expect(posix.normalize(file) === file && file.startsWith(SUBJECT_ROOT) && file.endsWith('.ts') && !/\.(test|spec|testkit|d)\.ts$/.test(file),
    `${id}: ${file} is a normalized non-test .ts file under ${SUBJECT_ROOT}`).toBe(true);
  ```
  This needs `import { join, posix } from 'node:path';`.

### N3 — The runner check is textual and one-directional (note; test bytes)
- **Severity:** low.
- **Evidence** [Observed]. Line :68 is `expect(runner, file).toContain(`'${file}'`)`, a substring test over the runner's
  whole text.
  - Q15 comments out `provider-draft.test.ts` in `TEST_FILES` and keeps the quoted path in the comment: the test passes.
  - Today each quoted path occurs exactly once in the runner (count 1 for each of the four).
  - The test's `RUNNER_TEST_FILES` is a hand copy. If a fifth runner file is added, the test cannot see it: must-fail
    names in that file are then refused falsely, which is conservative.
- **Failure scenario.** A PR disables one runner test file in a way that keeps its path in the text. Every mutant whose
  must-fail names live there survives in the next scheduled run.
- **Proposed fix** (probed in §3.9; kills Q15). Read `TEST_FILES` with the compiler API the file already imports, and
  assert equality with the list:
  `expect(runnerTestFiles(), 'the runner\'s TEST_FILES').toEqual(RUNNER_TEST_FILES);`. The full `runnerTestFiles` is in
  `probe-fix.diff`. Alternatively, use the parsed list in place of the hand copy.

### N4 — Five sentences claim more than their check does (note; PR body and test header :5-6, :10-13)
- **Severity:** low. Each sentence is true for every comment, spacing, path and runner shape that the plan, the
  sources and the runner hold today. Each counterexample below is constructed. I do not rate them as false sentences
  under the verdict rule, for two reasons: none changes what the test accepts for a plausible drift, and each claim
  names its mechanism (`removeComments`, `startsWith`, `toContain`) in the same place. The coordinator may reclassify.
- **Evidence** [Observed]:
  1. PR body: "A fragment matched only in a comment fails this check". The header says the same at :12. Q3b: a
     fragment kept only in a detached `/*!` comment at the head of the file passes.
  2. PR body and header :12-13: "a `to` that differs from `from` only in spacing" fails. This is true for whitespace
     between tokens. Whitespace inside a string literal, or a newline after `return`, changes the emit and passes
     (§3.5 probes). That is correct behaviour, since both change what the code does.
  3. PR body "R2: the file is a non-test file under `packages/polaris-generation-core/src/`". The header says the same
     at :10. Q16 is a counterexample.
  4. PR body "The length row also checks that the runner's `TEST_FILES` still lists those four files". Q15 is a
     counterexample: the row checks that the runner's text contains each quoted path.
  5. Header :5-6: "syzygy-kpbq found the scheduled gate red on every run from 2026-10-04 to 2026-10-27". All 24
     scheduled runs failed. The window also holds one dispatched run on `agent/syzygy-kpbq`, which passed (§3.8).
- **Proposed fix.** In the PR body:
  - "A fragment whose only occurrence is in a comment that `removeComments` drops (every comment except a detached
    `/*!` at the head of a file) fails this check, and so does a `to` that differs from `from` only in whitespace
    between tokens."
  - "R2: the path starts with `packages/polaris-generation-core/src/` and does not end in `.test.ts`."
  - "The length row also checks that the runner's source contains each of those four quoted paths."
  - In header :5, "red on every run" → "red on every scheduled run".
  - If N2 and N3 land, items 3 and 4 become true as written.

### N5 — The length row's two failures name no mutation (note; test bytes)
- **Severity:** low.
- **Evidence** [Observed, §3.3]. T6 (a duplicated id) and T7 (a dropped mutation) both print only
  `AssertionError: expected 11 to be 12 // Object.is equality`. Neither says which id is duplicated or missing.
  Bar 7 (:82-84): "A maintainer should localize the bug from failure output alone."
- **Proposed fix:**
  - `const ids = GENERATION_LITERAL_MUTATIONS.map((m) => m.id);`
  - `expect(ids.filter((id, index) => ids.indexOf(id) !== index), 'duplicate mutation ids').toEqual([]);`
  - Give the length check `ids.join(', ')` as its message.

### N6 — The PR body's test delta uses a convention other than the repo's list-based one (note; PR body)
- **Severity:** informational.
- **Evidence** [Observed].
  - `vitest list` of the file gives 1 name at the base and 13 at the head. All 13 head names are new, and the base
    name is gone.
  - The repo's precedent tool (`docs/evidence/chrome-singleton-leak-2026-10-22/compare_test_lists.py`, `'testsLine':
    f'Tests: +{…} ~0 -{…}'` over full test names) would print `Tests: +13 ~0 -1`.
  - The PR body says `Tests: +2 ~0 -1` "(rows as written; the `it.each` row counts once)". It also says "The file ran 1
    test at the base and runs 13 at the head".
  - So the figure is true under its stated convention, and it is not false. It does differ from the precedent.
- **Proposed fix.** State the list-based figure beside it, for example "`Tests: +13 ~0 -1` by `vitest list` names (+2
  ~0 -1 as written)". Bar 10 is met either way (§7).

### N7 — The PR body's battery line is unresolved (note; PR body)
- **Evidence** [Observed]. The PR body at review time (`pr-body-at-review.md`, sha256 `52df557a…9792`) has line 46,
  "- the battery: running; the result will be added here."
- **Unknown:** whether the battery finished, and what it reported.
- **Proposed fix.** Before merge, record the battery's commit and its result, or remove the line. Rule 7: "the report
  is valid only for that commit."

### N8 — node-ci now refuses must-fail title renames in another package; name it in the owner notice (note; landing)
- **Evidence** [Observed, §2, §3.6].
  - The 13 must-fail names are titles in `packages/polaris-generation-core/src/{canonical-json,parse-json,pipeline,provider-draft}.test.ts`.
  - A PR that renames one of them now fails `apps/three-surface-poc/src/polaris-generation/generation-mutation.test.ts`
    in node-ci's `npm test` step. Before this PR, that rename passed node-ci and turned the scheduled gate red as
    `SURVIVED`.
  - This adds to the prospective refusal that R-GP-IMPL-GEN-MUTATION-PLAN-1 N9 asked the owner notice to name.
- **Proposed fix.** The `syzygy-bpyt.10` cycle report should say that node-ci now also refuses these:
  - must-fail title drift;
  - plan files outside the prefix;
  - emit-neutral mutations.

  It should also say that the scheduled gate's rule is unchanged.

## 5. Changed outputs

[Observed] The diff changes **no product output**:
- no file under `packages/**` changed;
- the only `apps/**` changes are the test and the plan comment, and the plan's emit is byte-equal (§3.1);
- the runner (`24bf40d8…`) and the gate workflow (`26b6eb14…`) are byte-equal at base and head;
- no file under `.syzygy/**` or `openspec/**` changed (4 changed paths, enumerated in §3.1).

The test's own observable output changes:
- 1 → 13 tests;
- new titles (`list-head.txt`);
- failures now carry ids.

The two added evidence files are new outputs (`test-mutants.json`, 608 lines, and the tool that wrote it). Hosted
`checks` and `node` pass at `02eb444f` (§1).

## 6. Verdicts on the four items

- **N2 (item 1) — done.**
  - The single loop is now one `it.each` row per mutation, keyed by id.
  - The length and distinct-id checks keep their own row.
  - V1 and my Q20 report two and three drifts by id in one run.
  - Every row expectation carries the id. Only the length row's two checks do not (N5).
- **N3 (item 2) — done for the four survivors**; residual textual gaps are N1-N3.
  - R1, R2, R4 and R5 are killed byte for byte, each with a named message (§3.4).
  - The title reader sees all 66 of the 66 titles the four files hold (§3.2).
  - No check throws at describe time. The only describe-time code is `GENERATION_LITERAL_MUTATIONS.map(...)`, and all
    reads and parses run inside `it` bodies.
  - A missing TypeScript fails the file loudly (Q21: `0/0`, file error, exit non-zero).
  - The header says the rows check shape and not semantics, as the round-1 note asked.
- **N4 (item 3) — done.**
  - The plan's targets are canonical-json 3, parse-json 3, pipeline 3, provider-draft 2 and draft-model 1.
  - They sit in five contiguous groups by `file`, so "grouped by the file they target" is true.
  - The `provider-draft.ts.` section comment covers the draft-model mutant and explains why.
- **N8 (item 4) — done.**
  - The count is gone and the period is dated.
  - The date span and the cause match the run history (§3.8).
  - "every run" is precise only for scheduled runs (N4 item 5).

## 7. Test quality

- **Core rule (:42-43).** A plausible bug makes each predicate fail:
  - T1-T7, R1-R8 and V1-V4 kill on their predicate;
  - my Q3, Q4, Q5, Q8, Q10, Q12, Q13 and Q20 kill too;
  - Q22 and Q23 show that `removeComments` and substring matching are load-bearing.
- **No tautology.** The expected values are literals (`12`, `1`, `true`). The emit check calls the runner's own
  `applyLiteralMutation`. The reader is an independent parse of the test files, not a copy of the runner's matching.
  The two matchers agree on all 13 current names (§3.6).
- **Bar 7 (:82-84).** Met for the 12 rows: each failure starts with the id and the check. Partly met for the length
  row (N5).
- **Bar 8.** The reader is small and readable. `RUNNER_TEST_FILES.flatMap(testTitles)` re-parses the four files in each
  of the 12 rows. That is cheap today (2.03 s for the file at load 48), and a memoized helper would remove the repeat.
  Do not hoist it to describe time (AGENTS.md :290-291).
- **Bar 10 (:93-97).** It extends the nearest test, the plan test itself, rather than adding a new file. The net delta
  is +13 −1 by names, or +2 −1 as written (N6). Each row catches a drift that the old single test reported only first
  (V1, Q20), so the growth is governed.
- **Robustness.**
  - `import ts from 'typescript'` follows six existing tests (for example `apps/three-surface-poc/src/git-observation.test.ts:14`).
  - TypeScript is a root devDependency (`"typescript": "^5.5.0"`, version 5.9.3 in the clone).
  - The file runs in about 4 s, alone or on the merge.
- **Rule 6 record.** The record satisfies AGENTS.md :292-294 for the tool's own mutants:
  - `test-mutants.json` stores each mutant's `old`/`new` and its commit;
  - its commit `b5307ee1` is on the PR branch;
  - its file digests equal the reviewed bytes.

  If the PR were rebase-merged, `b5307ee1` would become unreachable. A merge commit keeps it reachable, and recent
  merges on main are merge commits.

## 8. Cleanup

- **Deleted:**
  - the scratch clone `rev-546/clone`, including its local `review-merge` and `review-fix-probe` branches, which were
    never pushed;
  - the private TMPDIRs `/tmp/r546-1` … `/tmp/r546-4`. `ls -d /tmp/r546-*` gives `0`.
- **Removed as over 300 KB:** the hosted node log (200,124 bytes; its relevant lines are kept in
  `node-run-excerpt.txt`) and the full-suite JSON (2,130,636 bytes; its counts are kept in `full-suite-summary.json`).
- **No PR, branch, comment, workflow or bead was touched.**

Kept under `rev-546/` (37 files besides this raw; none over 300 KB):

| Path | sha256 |
|---|---|
| `check-governance.txt` | `a860f52caa6bcf71bf95fef5ebf8868eeb1ce5b1f534cac032dd031a51db103a` |
| `check-partition.txt` | `5293d41c4e816d150bb843f94dbbcc6710f13492eecd42a796434d68a0bb5ecb` |
| `check-quotations.txt` | `0c0c541f69396255b5fc5c0e926f5588bad2c0a85a242f09ba5761d65f8272cd` |
| `compare-edits.txt` | `7198a8ad975c2ad90a1b1dd6b8af859ada5c40a5c9ba5bd004b0b6b78424ecd2` |
| `four-files.json` | `4e069c07bed7e2c2d720b53d9091b6b20eb94f3a4dd0bd78313cf4fb465c8c58` |
| `full-suite-load.txt` | `ba7357e5c5b73a2f256e666e043fa2d8dc2910763297b6e8e5c5045d0e5aa179` |
| `full-suite-summary.json` | `2285e28d8e86ae41eccbad292abe3e198512a71e173a4aa2ab9f9c1b6518dc4e` |
| `full-suite.log` | `d12ee195ec5a800f6d51524be91cac03ecda041439d4ecec96024bd94dc573bd` |
| `gate-runs.tsv` | `4f70b2edbba44b90e52456e887df84fd5a0d96bb11b4b2d26e1b908ef1872b11` |
| `list-base.txt` | `7a76df254073defea5e72653146b311c48b596ea19b22cdfd494fd2420881d99` |
| `list-head.txt` | `553654eee891099b70cf53629d287c2b894e86502c4a7223cd31f6ac51a36670` |
| `mustfail-match.jsonl` | `3ac18e7bdb87b4eb74a3a5df5fe6f8cdcbda93eb92911747c32d3b83d023046b` |
| `node-run-excerpt.txt` | `4f50d7a7f33b0b1925d71b037787f50b76536a139c83effaa7273a75a198ffc0` |
| `npm-ci.log` | `f02ec60b07980800c9c0f37801e85b6e46715ed987256433a32fe81b4a88831a` |
| `own-mutants-run.log` | `f4d005116fd0f5d4c0e452cc60d3c62eabf5e975fe9df56cf22039769a0610b5` |
| `own-mutants.json` | `0d332cb1e0b82f578ea363072063e18b41f04e9be32f0f50d8562d9c936f2eb0` |
| `plan-test-alone.time` | `29bc55b61281d2c5ed77e0916877f26ce894c4187bfbbf010cc21cdf315ba4b0` |
| `plan-test-alone.txt` | `285cdee0da63c445285391f75f2d66d2179c87ba199dc23de186b00e86ed9118` |
| `plan-test-merge.txt` | `5518b3f5ccf528d8284916e086056a5e8a70526257afe96fb4f6c12ec91373da` |
| `pr-body-at-review.md` | `52df557aa888582487942f6a0e2427ff719ae7b20095b5c44dd2e96de8619792` |
| `probe-fix-mutants.json` | `f8c10821ddc2166445e9e0941c6238b2e34d43672fe34bb777a2bf613161d550` |
| `probe-fix-run.log` | `d7c1dec8c44893eca1cd1d803438a603c104d5a5ec2a8cd93c88056852025a5b` |
| `probe-fix.diff` | `ffd53662861bc77116f02cf85d9880088277b7bfaffe1c115a3fd5ef5828567d` |
| `reviewer-survivors.json` | `c96a60db9ff2efbc001929c47c2fc5b951243d007bd75cfacca53510b2c3ce7b` |
| `scope-check.txt` | `043a3ecbb5281aa7906dd569b441fc78f87d89858b1ffd03ec6883b341baeb5c` |
| `test-mutants-at-02eb444f.json` | `0feaa00f28432489fc098d7c787f7f35b51eb38451d23d8afda2c1d3ae4c84b9` |
| `test-mutants-run.log` | `0890f937e0438f194983343544917b5f2c48ea59c582f792a2bdf1b055003dcf` |
| `title-census.jsonl` | `27dec5c72948a5731bfd242116ff2a9022f0943680ae768b9e5ae4f254577001` |
| `tools/compare_edits.py` | `ada35db24c5815113da18654940573aa6d157d0e7e656e30adaaa1f8ba212ab3` |
| `tools/emit.cjs` | `b5b360f9542cee16e313a8746eb2c0a40b413eca32393e09ca31bd6017a21ee1` |
| `tools/mustfail_match.mjs` | `1d4f9e41d4b0a08950ce05fc3a996ea2081f9b791f5b6f3f7ba6060c2bf73ba9` |
| `tools/own_mutants.py` | `d7a91eb5dfe1707328d464dce4b9009462e361790797a3f53c9d15ac0ba87b05` |
| `tools/probe_fix.py` | `4dc9b7620ee4c33cb6b2c97c0ffb5969df46ab609c6cbba3cfd97f5036deb407` |
| `tools/reviewer_survivors.py` | `0f096e22c76956c627d1892f0f5bd668c685158e8e8027e48833c288ca6c9b07` |
| `tools/scope_check.py` | `cc769e224c8a323930e3305cc678ff6e9b35ad6d1f66455fef5914e17f800b6e` |
| `tools/title_census.cjs` | `d6b0b0aab8ed7d3885a3962a4daae706fc0544ec01979b6025a82eefd4d1c2f4` |
| `typecheck.log` | `f21762922bb179fa5dc8c33e881c4f062ef1c33bf48c7d3dad2dd0e5cd30ee98` |
