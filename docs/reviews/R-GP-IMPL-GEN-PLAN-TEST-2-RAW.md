# R-GP-IMPL-GEN-PLAN-TEST-2 — CC-REV-1 implementation review of syzygy-bpyt.47, round 1
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 5cf4223a
Subject: r1-review.diff sha256 0c8b28b2fba6d838d0b11a6a38ae7a84f8602ec6e94cd7c5566590d0af796545

Reviewer: an independent, fresh-context reviewer. I did not author the change. I worked from the brief, the subject diff,
the PR body, the bead and the governing references. Date: 2026-10-28 (runs below are stamped UTC). Every run was in a
private scratch clone of `/home/tze/GitHub/syzygy` under `rev-550/`, with its own TMPDIR. No target-repository content was
read, and nothing under `~/.claude/` or `~/.config/` was opened. Nothing was pushed, commented, merged, dispatched or
written to `bd` (`bd show` only). I did not open the author lane's scratch notes. I read one coordinator file, the
battery `SUMMARY.txt` (§3.7).

## 1. Subject identity checks

All [Observed], by script, in the scratch clone (`git fetch` of `agent/syzygy-bpyt.47` and `main` from GitHub).

| Check | Expected | Result |
|---|---|---|
| `sha256sum r1-review.diff` | `0c8b28b2…6545` | `0c8b28b2fba6d838d0b11a6a38ae7a84f8602ec6e94cd7c5566590d0af796545`, **match** |
| `git diff 95c87a52 5cf4223a \| sha256sum` | `0c8b28b2…6545` | `0c8b28b2fba6d838d0b11a6a38ae7a84f8602ec6e94cd7c5566590d0af796545`, **match** |
| `git diff 95c87a52 5cf4223a -- ':!docs/evidence' \| sha256sum` | `dee2b816…f0e2` | `dee2b816db6133b14850806c01788a5122d4042f8cc28e101c21b2769661f0e2`, **match** |
| `git diff --stat` | 4 files | `4 files changed, 1868 insertions(+), 18 deletions(-)`: the test, the plan, `test-mutants.json`, `test_mutants.py` |
| PR body (`gh pr view 550 … --jq .body \| sha256sum`) | `59b2f6a8…01ac` | `59b2f6a8d35fdc1872d7cb3a97b495f4f87e2b8f3fb4314f726b0cf7b64801ac`, **match**. Read at the start and again at the end |
| PR head (`headRefOid`, `git ls-remote`) | `5cf4223a` | `5cf4223a184baab1a748566b2f46053dcda72e58`, at the start and at the end |
| commits | — | `5d7537a6` (test and plan comment), then `5cf4223a`. `git diff --stat 5d7537a6 5cf4223a` gives 2 files, both under `docs/evidence/syzygy-bpyt-47/`, +1825 |

**Main movement.** `git ls-remote … refs/heads/main` returned `95c87a52b5a03ef4b1842e82b1c1b961cb51daa3` at the start and
again just before this raw was written. `gh pr view 545` returned `"state":"OPEN"`, `"mergedAt":null`. So main changed **0**
paths since `95c87a52`, and none of them is a PR path or a path the plan test reads. The merge with main is the
reviewed tree itself, so no separate merge run was needed. [Observed]

**Round-1 inputs at the base** [Observed]:
- `docs/reviews/R-GP-IMPL-GEN-PLAN-TEST-1-RAW.md` hashes to `cb13015ab85e…9bedc`, as the bead names it.
- The probe and the reviewer's tool live in `docs/evidence/gen-plan-test-review-2026-10-28/r1/`:
  `probe-fix.diff` is `ffd53662…567d` and `tools/own_mutants.py` is `d7a91eb5…7b05`. Both equal the round-1 raw's own
  cleanup table (:472, :481).
- `git grep -l -F probe-fix 95c87a52` does not list that directory. The files there do not contain the string, so I
  found them with `git ls-tree -r --name-only`.

**Hosted CI at `5cf4223a`** [Observed]. `gh pr checks 550` returned
`checks	pass	20m16s	…/runs/40591207342/…` and `node	pass	4m7s	…/runs/40591207346/…`. Both runs have
`"conclusion":"success","event":"pull_request","headSha":"5cf4223a184baab1a748566b2f46053dcda72e58"`. The node log shows:
- `HEAD is now at 6bb51bd4 Merge 5cf4223a… into 95c87a52…`;
- `generation-mutation.test.ts (13 tests)`;
- `Test Files  251 passed | 3 skipped (254)` and `Tests  5518 passed | 5 skipped (5523)`;
- for the second vitest step, `Test Files  10 passed (10)` and `Tests  51 passed (51)`.

## 2. Clauses relied on (quoted), and the class ruling

**CC-REV-1**, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at `5cf4223a`:
- :31-43, the classes: "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization
  (VIS-5, VIS-6); 2. **graph identity** — entity identity minting, continuity, split/merge …; 3. **deterministic
  observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7); 4. **security** —
  anything under SEC-1…SEC-5, auth surfaces, egress paths; 5. **data migration** — `.syzygy/**` schema migrations, any
  identity-affecting store change; 6. **public interface** — machine-queryable endpoints, adapter contracts, anything an
  external consumer can depend on; 7. **certificate logic** — …".
- :45-47: "**Class membership is contested by default and is never finally determined by the agent performing the
  change**".
- :49-50: "**The change record states** which classes the change touches, or "none," so a misclassification is a findable
  violation after the fact."
- :51: "**A reviewer or the owner** may reclassify at any time."

**GP-Q0**, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md` at `5cf4223a`:
- :51: "Behavior-preserving refactors may proceed under the acts already in force. They may touch `apps/**`,
  `packages/**`, `scripts/**`, tests, CI and root manifests."
- :52-55: ""Behavior-preserving" means none of the following changes: - a rendered byte, a wire format, a refusal string
  or an exit code; - a signed or digest-bound artifact; - a consent, security or retention decision."
- :56: "Bead `syzygy-bpyt.10` is the cycle report".
- :60: "Each pull request states which CC-REV-1 classes it touches. Any pull request whose classes are not "none" gets the
  CC-REV-1 independent review, from a fresh-context reviewer on the default model."
- :95-96, the stop clause: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

**AGENTS.md** at `5cf4223a`:
- rule 6 (:126-127): "Mutate the input and confirm the check fails, per predicate, before trusting it";
- rule 10 (:133): "Freeze the bytes a review is bound to; any later edit retires the review.";
- rule 11 (:134-135): "An evidence record names its subject and the subject's digest";
- the rule-6 record guardrail: "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it
  ran at".

**Test-rigor bar**, `git show 5cf4223a:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`:
- :42-43: "**A test is worth keeping only if some plausible bug makes it fail.**";
- :64-67 (bar 4): "**No tautologies** — … Expected values are literals or independently derived.";
- :82-84 (bar 7): "**A failure names the defect** — Test names state expected behavior ("rejects_expired_token");
  assertion messages make the diff readable. A maintainer should localize the bug from failure output alone.";
- :93-96 (bar 10): "**Growth is governed** — A test is worth *adding* only if it catches a plausible bug no existing test
  catches … Reviews state the net test delta".

**Class ruling: none.** [Observed for the facts, Inferred for the ruling.]
- The diff touches one test file, one comment inside an interface in the plan module, and two evidence files.
- The plan module emits the same JavaScript and the same declaration text at base and head (§5).
- None of the seven classes is reached. The test reads repository files and uses TypeScript's compiler API. It mints no
  identity, composes no snapshot, crosses no authority or egress boundary, migrates nothing and exposes no interface.
- Under GP-Q0 :52-55, no rendered byte, wire format, refusal string or exit code of any product changes. The only
  observable output that changes is the plan test's own: what it accepts, and its failure messages.

**Gates, and the stop clause.**
- The scheduled gate is the workflow `generation-mutation-gate.yml`. It runs only `npm run poc:generation-mutation-run`
  (:48). Its pass/fail rule is `return survived === 0 && restoreFailures === 0 ? 0 : 1;`
  (`generation-mutation-run-main.ts:187`).
- The runner is `24bf40d8c529…5d34` at base and head, and the workflow is `26b6eb14105b…a380` at base and head. The plan's
  emit is equal. The plan test is not in the runner's `TEST_FILES`, and no workflow names it.
- So **the scheduled gate's decision does not move for any plan**: its code and its plan data are byte-identical in
  effect. [Observed: hashes and emit; Inferred: "for any plan"]
- What changes is what node-ci's `npm test` step refuses. This is the same kind of change as PR #546: a test guard that
  refuses more plan shapes. Its round-1 dispositions record (`docs/evidence/gen-plan-test-round-1-dispositions-2026-10-28.md:57-63`)
  says "The coordinator posted a notice on `syzygy-bpyt.10` at landing that names those refusals". **This change fits
  that precedent.**
- One refusal is new in kind, but still a test-guard refusal: node-ci now refuses an edit to the *runner's* source. A
  fifth runner test file, a second `TEST_FILES` declaration, or a non-literal list element each fails the plan test.
  Before, `toContain` let any addition through. The PR body's residuals name this.
- Nothing outside that precedent changes what a gate accepts or refuses. No product gate is touched.

## 3. What I ran, and the results

Load is `/proc/loadavg` (load1 load5 load15), before → after. All runs are at `5cf4223a` unless stated.

### 3.1 Emit of the plan module (`tools/emit_compare.cjs` → `emit-compare.txt`)
TypeScript `5.9.3`. Base `95c87a52` and head `5cf4223a`:
- `transpile removeComments=false`: `e8210eff…5db2` both, `EQUAL`;
- `transpile removeComments=true`: `6c72c0be…5374` both, `EQUAL`. This is the same value the round-1 raw reports;
- `transpile NodeNext`: `805ddc75…811f` both, `EQUAL`;
- isolated declaration emit: `2296c246…0194` both. The `mustFail` member line is `readonly mustFail: readonly string[];`
  in both, so the comment does not reach the `.d.ts`.

`npm run typecheck`: exit 0 (load 26.85 → 28.49).

### 3.2 The PR's rule-6 tool, re-run (`test-mutants-at-5cf4223a.json`, `test-mutants-run.log`)
`TMPDIR=/tmp/r550-1 python3 -I docs/evidence/syzygy-bpyt-47/test_mutants.py ../test-mutants-at-5cf4223a.json`, from
00:13:30Z, load 21.40 → 48.29. Every row, all 47, ran. It printed:
`control passed; {'mutants': 47, 'asExpected': 47, 'killed': 39, 'survived': ['R3', 'Q9', 'Q22', 'K1', 'K2', 'K3', 'K4', 'K5'], 'restored': 47}; tree clean False`.
- **`tree clean False` came from me, not from the tool.** `git status` showed only `?? .beads.gate.lock`. That empty
  file has mtime 08:13 local (00:13Z). It was created by the `bd show` I ran inside the clone while the tool ran. The
  tool runs no `bd`. Once I deleted the file, `git status --porcelain | wc -l` gave `0`. [Observed; the attribution is
  Inferred]
- **Compared with the committed record:**
  - tool sha256 equal (`677682a9…`);
  - imported-tool sha256s equal (`99fbcca0…`, `d7a91eb5…`), and each equals that file at `5cf4223a`;
  - the five recorded file digests equal the file bytes at **both** `5d7537a6` and `5cf4223a`;
  - the summary is equal;
  - **0 of 47** rows differ in outcome, `asExpected` or failed-test count;
  - the failure messages differ only in R6 and Q21, whose paths name the clone (`/tmp/laneb-b47/clone/…` against mine).
- **The record's commit** is `5d7537a6`, an ancestor of the PR head. The record's `treeCleanAfter` is `true`.
- **Every kill's failing assertion, read** (the first line of each). 37 of the 39 kills are `AssertionError` lines, and
  each names the mutation id or the check:
  - R1 and R5: `… the mutation changes the emitted JavaScript`;
  - R2, V3, Q16-Q19, W4 and W5: `… is a normalized non-test .ts file under packages/polaris-generation-core/src/: expected false to be true`;
  - R4, V4, Q8, Q10, Q12, Q13 and Q23a: `… test titles holding must-fail "…": expected +0 to be 1`;
  - W3: `expected 14 to be 1`;
  - Q11, Q14, W1 and W2: `… must-fail "…" is a literal title fragment: expected false to be true`;
  - T6: `duplicate mutation ids: expected 'canonical-json-sorted-keys-disabled' to be ''`;
  - T7: the 11 ids (I counted them: `11`), then `: expected 11 to be 12`;
  - V2 and Q15: `the runner's TEST_FILES declarations: expected [ [ …(3) ] ] to deeply equal [ [ …(4) ] ]`;
  - W6: `expected [ [ …(4) ], …(1) ] to deeply equal [ [ …(4) ] ]`;
  - W7: `expected [ [ …(5) ] ] to deeply equal [ [ …(4) ] ]`.

  The other two kills are R6 (`Error: ENOENT: … draft-modle.ts`) and Q21 (`Cannot find package 'typescript-missing'`,
  `0/0`). Both are the intended failure. **No line contains `imeout`** (sweep over all 47 rows: `timeouts 0`).
- **The K rows.** K1-K5 each ran `0/13` failed with exit 0, so each is a real survival and not a vacuous one. Each K row
  is its W row's input with exactly one arm taken out of the test, so each W1-W5 row is refused by its arm alone. W6 and
  W7 have no K row. My O3 and O6 (§3.3) are their isolations, and both survive.
- **R3 survived `0/8`.** That is by design: R3 is a check-side row that cuts the `it.each` table to seven rows. It was
  carried from `syzygy-vsqr`, and it was expected to survive.

### 3.3 My own mutants (`tools/own_mutants.py` → `own-mutants.json`, `own-mutants-run.log`)
There are 14 rows, and I wrote each prediction before its run. The rows reuse the PR tool's `run_test`, imported by path.
The control passed `13/13`. Load 36.23 → 36.25. Result:
`{'mutants': 14, 'killed': 5, 'survived': 9, 'matchesPrediction': 14, 'restored': 14} tree clean True`. The record stores
each edit's `old`/`new` and the commit, `5cf4223a`. The final tool is `460a8aff…`, and the whole set was re-run with it.

| Id | Weakening or input | Outcome | Reading |
|---|---|---|---|
| O1a | input: `packages/polaris-generation-core/src//draft-model.ts` (doubled slash) | killed, `… src//draft-model.ts is a normalized non-test .ts file …: expected false to be true` | the normalize arm refuses a form the PR's rows do not hold |
| O1b | O1a's input; the path check normalizes before comparing | survived | the arm's order (compare the raw path) is load-bearing |
| O2a | input: must-fail `'Rejects Pollution Keys'` | killed, `test titles holding must-fail "Rejects Pollution Keys": expected +0 to be 1` | — |
| O2b | O2a's input; the title count is case-insensitive | survived | the PR record has no case row (see §7) |
| O3 | W6's input; the reader keeps only the first declaration (`return lists.slice(0, 1);`) | survived | isolates W6: collecting every declaration is load-bearing |
| O4a | T6's input (a duplicated id) | killed, `duplicate mutation ids: expected 'canonical-json-sorted-keys-disabled' to be ''` | — |
| O4b | T6's input; the duplicate check runs over `[...new Set(ids)]` | survived | the duplicate check is load-bearing (the length stays 12 under T6) |
| O5a | input: a title `'rejects pollution keys %%: %s'` and must-fail `'rejects pollution keys %%'` (vitest prints `%%` as `%`, so the runner can never match it) | killed, `must-fail "rejects pollution keys %%" is a literal title fragment` | — |
| O5b | O5a's input; the `%` arm is `/%[a-z]\|\$/` | survived | the PR record has no `%%` row (§7) |
| O6 | W7's input; the reader drops non-literal elements (the probe's `filter(ts.isStringLiteralLike)`) | survived | isolates W7 at the head |
| O7 | must-fail `'validation'` for `provider-draft-unknown-source-check-disabled` | **survived** | **N2**: one `it` title holds it, and 21 runner `fullName`s do |
| O8 | runner: `'run', ...TEST_FILES.slice(1), '--reporter=json'` | **survived** | **N3**: the check reads the declaration, not its use |
| O9a | two mutations with id `''` | **survived** | **N1**: `[''].join(', ')` is `''` |
| O9b | O9a's input; the probe's array form `toEqual([])` | killed, `duplicate mutation ids: expected [ '' ] to deeply equal []` | the probe's form refuses it |

O7's denominator [Observed] comes from the round-1 reviewer's retained vitest JSON of the runner's four files
(`docs/evidence/gen-plan-test-review-2026-10-28/r1/four-files.json`, 107 `fullName`s). `'validation'` occurs in **21**
of them, and in exactly **1** of the 66 captured `it` titles (`title-census.jsonl`). The other describe-title fragments
that one `it` title holds are `'reviewer verdict'` (6 fullNames), `'deterministic'` (7) and `'source to'` (34). The four
runner test files are unchanged since that capture: the PR touches none of them, and `parse-json.test.ts`'s digest
`40985898…` is the same at `5d7537a6` and `5cf4223a`.

### 3.4 The deviations, re-run
- **N3, the probe's reader with W7.** I checked out `95c87a52` and ran `git apply` of the round-1 `probe-fix.diff`. Then
  I applied W7's runner edit with `tools/w7_probe.py`. The diff stat was `2 files changed, 23 insertions(+), 5 deletions(-)`.
  - Without W7: `Test Files  1 passed (1)`, `Tests  13 passed (13)`.
  - With W7: `Test Files  1 passed (1)`, `Tests  13 passed (13)`.
  - Load 43.72 → 44.74.

  So the PR's stated reason is **true**: with the probe's reader, a spread element naming a fifth file passes.
- **N5, the probe's array form.** At `5cf4223a` I put the probe's `expect(ids.filter(…), 'duplicate mutation ids').toEqual([])`
  back and applied T6 (`tools/n5_probe.py`). The first failure line was
  `AssertionError: duplicate mutation ids: expected [ Array(1) ] to deeply equal []`, with `Tests  1 failed | 12 passed (13)`.
  So the PR's stated reason is **true**: that line does not name the duplicate. The `b3388a69` run itself is
  [Unknown]: that commit is unpushed and I did not open the author's log.
- **The TEST_FILES failure diff (bar 7).** With W7 at the head, vitest's terminal output under the summary line prints
  a `- Expected / + Received` block whose `+` line is
  `"...['packages/polaris-generation-core/src/island-boundary.test.ts']",`. So the failure names the offending element.

### 3.5 Test list
`npx vitest list` of the file gives 13 names at both `95c87a52` and `5cf4223a`. `cmp` says `IDENTICAL`, and both lists
are `553654ee…0e2b`, the same as the round-1 raw's `list-head.txt`. Both bodies changed: the first row and the shared
`it.each` body. So `Tests: +0 ~13 -0` is true under the repo's list-based convention.

### 3.6 Full suite, once, then failing files alone
`TMPDIR=/tmp/r550-4 CI=1 npm test` (`vitest run`), 00:24:03Z → 00:33:03Z, load 49.87 → 51.46 (`full-suite.log`):
`Test Files  8 failed | 243 passed | 3 skipped (254)`, `Tests  16 failed | 5437 passed | 70 skipped (5523)`, exit 1.
- **Every error was a timeout.** Counting error lines gave `16 Error: Test timed out in 5000ms.` and
  `1 Error: Hook timed out in 10000ms.`. The hook timeout is `act-families.test.ts`, which is why it has 65 skipped tests.
- **The 8 files:** `polaris-dossier/src/{close,gate-acts,run-evidence,screen,start-gates,waiting-sessions}.test.ts`,
  `polaris-generation-consent/src/act-families.test.ts` and `three-surface-poc-core/src/owner-act-record.test.ts`.
  The PR touches none of them, and `git diff --stat 95c87a52 5cf4223a -- packages/polaris-dossier packages/polaris-generation-consent`
  is empty.

Each file alone, at the default timeouts unless stated, in the order run:

| File | Lone run(s) at `5cf4223a` (load1 at start) | Passes alone? |
|---|---|---|
| `close.test.ts` | `9 passed (9)` (46.76) | yes |
| `gate-acts.test.ts` | `133 passed (133)` (45.90) | yes |
| `run-evidence.test.ts` | `2 failed \| 2 passed (4)`, timeouts (47.74); then `4 passed (4)` (28.55) | yes, second run |
| `screen.test.ts` | `110 passed (110)` (53.54) | yes |
| `start-gates.test.ts` | `7 failed \| 97 passed (104)`, timeouts (54.19); `1 failed \| 103 passed (104)`, timeout (32.12); then `104 passed (104)` (28.60) | yes, third run |
| `waiting-sessions.test.ts` | `116 passed (116)` (47.20) | yes |
| `act-families.test.ts` | `Hook timed out in 10000ms`, `65 skipped` (40.43); then `65 passed (65)` (30.80) | yes, second run |
| `owner-act-record.test.ts` | `19 passed (19)` (41.05) | yes |

The three files that timed out alone also passed at `5cf4223a` with `--testTimeout=60000 --hookTimeout=60000`, at load1
41.70 → 40.18: `4 passed (4)`, `104 passed (104)` and `65 passed (65)` (`rerun-timeout-head.txt`). At `95c87a52`
with the default timeouts, at load1 37.49 → 28.94, they gave `4 passed`, `104 passed` and `65 passed`
(`rerun-alone-base.txt`).

**Conclusion** [Inferred]: the local failures are host-load timeouts in files the change does not touch. Each file
passes alone, and hosted node at the merge passed the whole suite, 5518/5 (§1).

### 3.7 Checks, and the figures in the PR body
| Run | Result (verbatim) |
|---|---|
| plan test control, inside the two mutant tools | `13/13` passed, twice |
| `python3 scripts/check_governance.py` | `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted` |
| `python3 scripts/check_quotations.py` | exit 0 |
| `python3 scripts/check_docs_review_campaign_partition.py` | `total=578 assigned=578 raw=544 other=34 unmatched=0 overlaps=0` |
| battery | **not re-run by me** (host load ~45). The coordinator's `lead/battery-laneb-b47/SUMMARY.txt` (115 files in that directory) holds `commit=5cf4223a184baab1a748566b2f46053dcda72e58 commands=114 nonzero=0`. That matches the PR line [Observed in that file only] |

## 4. Findings

There is no blocking finding, and there are five notes. None of them reaches a product gate or the scheduled gate's
rule, and the current plan passes under every check.

### N1 — The N5 deviation is weaker than the probe for one input: a duplicated empty id (note; test bytes)
- **Severity:** low.
- **Evidence** [Observed, O9a/O9b].
  - The check is `expect(ids.filter((id, index) => ids.indexOf(id) !== index).join(', '), 'duplicate mutation ids').toBe('')`
    (`generation-mutation.test.ts:86`).
  - With two mutations whose id is `''`, the filter gives `['']`, which joins to `''`. The row passes, and so does the
    length check, at 12. The test passes `13/13` (O9a).
  - The probe's array form refuses the same input: `expected [ '' ] to deeply equal []` (O9b).
  - A duplicated non-empty id always gives a non-empty join, so the gap is exactly the empty-string id.
- **Why it is not blocking.** The survivor needs the id to be exactly `''` in two entries of a hand-written list, and
  every id is a kebab-case name today. I do not think that is a plausible drift (test-rigor :42-43). The PR body also
  does not claim the join form is as strict as the probe. It claims only that the join form names the duplicate, which
  is true (§3.4).
- **Failure scenario.** Two copied entry templates keep `id: ''`. The plan test passes, the 12 rows print titles that
  start with `: names a non-test file …`, and the runner's `--only` cannot select either entry.
- **Fix:** quote each duplicate, so the empty id is visible and the check stays a string comparison:
  ```ts
  expect(ids.filter((id, index) => ids.indexOf(id) !== index).map((id) => JSON.stringify(id)).join(', '), 'duplicate mutation ids').toBe('');
  ```
  T6 then prints `expected '"canonical-json-sorted-keys-disabled"' to be ''`, and O9a prints `expected '""' to be ''`.
  Update T6's expected substring in `test_mutants.py` to match.

### N2 — The exactly-one count reads `it` titles, but the runner matches full names (note; test bytes)
- **Severity:** low.
- **Evidence** [Observed, O7, §3.3].
  - The must-fail name `'validation'` is held by exactly one `it` title. That title is `'rejects duplicate-key output
    before schema validation and never records its body'`.
  - It is also in the `describe` title `'provider-local intermediate validation'`.
  - The plan test passes `13/13` with it.
  - The runner matches `failing.some((failing) => failing.includes(name))` over `fullName`
    (`generation-mutation-run-main.ts:137`, `:65`). `'validation'` occurs in 21 of the 107 runner `fullName`s, so a
    failure in any of the 21 satisfies it.
  - W3 (`'rejects'`, 14 titles) shows the arm's aim: refuse a name that many tests satisfy. A describe-title fragment
    gets past that aim because the reader never sees `describe` titles.
  - This is not a false sentence. The header and the PR body both say "`it` or `test` title".
- **Failure scenario.** A must-fail name is shortened to a word that also appears in its `describe` title. The plan
  test passes. The scheduled gate then counts the mutant killed when *any* test in that `describe` fails, including
  one the mutation's guard does not own.
- **Fix:** count over describe-qualified titles, which is the same string the runner's `fullName` matches. This also
  accepts Q13 (the full-name form), which the PR lists as a residual. In `testTitles`, carry the describe ancestors:
  ```ts
  function testTitles(file: string): string[] {
    const titles: string[] = [];
    const visit = (node: ts.Node, scope: readonly string[]): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'describe') {
        const [title, ...rest] = node.arguments;
        if (title !== undefined && ts.isStringLiteralLike(title)) {
          for (const child of rest) visit(child, [...scope, title.text]);
          return;
        }
      }
      if (ts.isCallExpression(node) && isTestCallee(node.expression)) {
        const [title] = node.arguments;
        if (title !== undefined && ts.isStringLiteralLike(title)) titles.push([...scope, title.text].join(' '));
      }
      ts.forEachChild(node, (child) => visit(child, scope));
    };
    visit(ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true), []);
    return titles;
  }
  ```
  Then reword the plan comment (:23-24) and the header to "describe-qualified titles". Q8 (a describe-only name) is then
  refused whenever its `describe` holds more than one test, and `'validation'` is refused by the exactly-one count.
  Re-run the PR tool. The Q13 and Q8 expectations change, so write their predictions first.

### N3 — The TEST_FILES check reads the declaration, not the runner's use of it (note; test bytes)
- **Severity:** low.
- **Evidence** [Observed, O8]. Changing the runner's vitest argv to `'run', ...TEST_FILES.slice(1), '--reporter=json'`
  leaves the declaration as the four literals, and the plan test passes `13/13`.
  - **A drop** through the use turns the scheduled gate red, because the names in the dropped file go missing. That is
    the loud direction.
  - **An addition** through the use, such as `[...TEST_FILES, 'packages/…/island-boundary.test.ts']`, is the risk the
    PR body cites as the reason for the N3 deviation: "The runner would then run a fifth file whose failures can
    satisfy a must-fail name". The new check does not see it.
  - The PR body does not claim the use is checked ("its only declaration of that name and equals the four files"), so
    this is not a false sentence.
- **Fix:** also pin the argv the runner passes to vitest:
  ```ts
  // Every array literal in the runner that holds 'vitest', as its elements' source text.
  function runnerVitestArgv(): string[][] {
    const lists: string[][] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isArrayLiteralExpression(node) && node.elements.some((element) => ts.isStringLiteralLike(element) && element.text === 'vitest'))
        lists.push(node.elements.map((element) => element.getText()));
      ts.forEachChild(node, visit);
    };
    visit(ts.createSourceFile(RUNNER, read(RUNNER), ts.ScriptTarget.Latest, true));
    return lists;
  }
  // in the first row:
  expect(runnerVitestArgv().map((argv) => argv.slice(0, 3)), "the runner's vitest argv").toEqual([["'vitest'", "'run'", '...TEST_FILES']]);
  ```
  Add a rule-6 row for it: O8's edit, and the `[...TEST_FILES, …]` form.

### N4 — Two PR-body sentences are imprecise, and the owner-notice list under-reports one refusal (note; PR body and landing)
- **Severity:** informational. I checked each sentence below at `5cf4223a`, and I do not rate any of them false.
- **Evidence** [Observed]:
  1. "no product byte changes" sits beside a diff that changes a comment byte in `apps/three-surface-poc/src/…/generation-mutation.ts`.
     It is true for every emitted byte: the JS under three option sets and the `.d.ts` are equal (§3.1). The same
     sentence's `[Observed: …]` names the plan comment. Precise form: "no emitted or rendered byte of any product module
     changes; the plan's source changes by one comment".
  2. "The probe's reader keeps the last `TEST_FILES` it visits". It keeps the last one **that has an array-literal
     initializer** (`if (ts.isArrayLiteralExpression(list)) files = …`), so a later non-array declaration leaves the
     earlier list in place. The deviation's conclusion is unaffected.
  3. The residual's draft for the `syzygy-bpyt.10` notice lists "unnormalized, `.spec`, `.testkit`, `.d` and `.tsx` plan
     paths". The rule `file.endsWith('.ts')` refuses **every** suffix other than `.ts`, including `.mts`, `.cts`, `.js`
     and `.json`, and the old check refused none of these.
- **Fix:** for the notice, write "unnormalized paths; `.test`, `.spec`, `.testkit` and `.d` files; and any path not
  ending in `.ts` (`.tsx`, `.mts`, `.js`, …)". Sentences 1 and 2 can be corrected in the dispositions record, and the PR
  body need not change.

### N5 — The local full suite fails on this host by timeouts; hosted node is the full-suite evidence of record (note; verification record)
- **Severity:** informational.
- **Evidence** [Observed, §3.6]. My one full run at load ~50 had 8 failing files, all of them timeouts in files the
  change does not touch. Every file passed alone. Two needed a second or third lone run, and all three load-sensitive
  files passed with 60 s timeouts. Hosted node at the merge `6bb51bd4` passed `5518 passed | 5 skipped (5523)`.
- **Failure scenario.** A later reader compares my run with the PR's `251 passed | 3 skipped`, finds 8 failures, and
  takes the difference for a regression.
- **Fix:** none to the bytes. The dispositions record should cite hosted node for the full-suite figure and this
  section for the lone runs. `start-gates.test.ts`, `run-evidence.test.ts` and `act-families.test.ts` are candidates for
  the load-sensitivity work that is already tracked, if one exists. I did not search `bd` for it.

## 5. Changed outputs

[Observed] **The diff changes no product output:**
- no file under `packages/**`, `.syzygy/**`, `openspec/**` or `.github/**` changed (4 changed paths, enumerated in §1);
- the only `apps/**` changes are the test and one comment line pair in the plan, whose JS and declaration emit are
  byte-equal (§3.1);
- the runner and the gate workflow are byte-equal at base and head (§2).

The test's own observable output changes:
- it refuses more inputs (§6);
- its failure messages name the ids, the duplicate, the path and the name;
- the `vitest list` names are unchanged (§3.5).

The two added evidence files are new outputs: `test-mutants.json` (1,548 lines) and the tool that wrote it. Rule 11 is
met: the record names its commit, the tool's sha256, both imported tools' sha256 and the digest of each touched file,
and all of these re-derive (§3.2). Hosted `checks` and `node` pass at `5cf4223a` (§1).

**What the plan test now refuses, compared with the current plan and the runner** [Observed for the plan, Inferred for
the runner]:
- The current plan passes every new check (control `13/13`):
  - all 13 must-fail names are literal, and each is held by exactly one title;
  - all 12 files are normalized `.ts` product modules;
  - the runner's `TEST_FILES` is the one four-literal `as const` list.
- Under the path rule, all 25 files under `packages/polaris-generation-core/src/` that pass it are product modules
  (49 tracked files there: 25 pass and 24 are refused). No test-support module passes it today.
- Some newly refused forms are ones the runner would run correctly:
  - W3-style many-title names;
  - a `./` spelling of a real file (W4);
  - a `.spec.ts` or `.testkit.ts` target;
  - a fifth runner test file.

  The runner does not *rely* on any of them: it uses none of them today. Refusing them is conservative, and it is
  node-ci that refuses them, not the scheduled gate.

## 6. Verdict on each note taken, and on each deviation

Each is judged against the round-1 raw's own fix text (`R-GP-IMPL-GEN-PLAN-TEST-1-RAW.md`).

- **N1 — met.**
  - The two `expect` lines at `generation-mutation.test.ts:102-103` are character-for-character the raw's :256-259
    block.
  - The plan comment at `generation-mutation.ts:23-24` is the raw's :261-262 wording, split over two lines.
  - Q11 and Q14 are now killed by `is a literal title fragment`. Q12 and Q13 stay refused, a residual the PR discloses.
- **N2 — met.**
  - The predicate at `:94-95` is the raw's :277-279 block, character for character, with `import { join, posix }`.
  - Q16, Q17, Q18 and Q19 are now killed by the path assertion. Q19 is killed by the path check before the
    `transpileModule` error.
- **N3 — met, by a stricter reader than the probe.**
  - The probe's text was `expect(runnerTestFiles(), 'the runner\'s TEST_FILES').toEqual(RUNNER_TEST_FILES)`. The head
    is `toEqual([RUNNER_TEST_FILES])` over every declaration.
  - **The deviation is at least as strict** [Inferred, by cases; Observed for W6, W7 and O6]:
    - The head passes only when there is exactly one declaration whose initializer, after unwrapping an `as`, is an
      array literal whose elements are, in order, the four strings.
    - A non-literal element's source text cannot equal a path, and a substitution-free template literal is
      `StringLiteralLike` under both readers.
    - Every input the head accepts, the probe also accepts. W6 and W7 are accepted by the probe and refused by the head.
  - **Its stated reason is true** (§3.4: the probe and W7 give 13/13).
  - Residual: N3 above.
- **N5 — met as the raw's fix text asked, with one corner weaker than the probe.**
  - The raw asked for "`expect(ids.filter((id, index) => ids.indexOf(id) !== index), 'duplicate mutation ids').toEqual([]);`"
    and for `ids.join(', ')` as the length check's message. Both are present. The duplicate check is in its joined form,
    and the length message is at `:85`.
  - **The deviation is not at least as strict** for a duplicated empty id (N1 above). For every non-empty duplicate,
    it is equally strict.
  - **Its stated reason is true** (§3.4, `expected [ Array(1) ] to deeply equal []`).
- **N4 item 5 — met.** Header :5-6 now reads "red on every scheduled run from 2026-10-04 to 2026-10-27".
- **The header deviation — acceptable.**
  - It describes the checks as they are now.
  - "a comment that removeComments drops" and "whitespace between tokens" are the wording of the raw's N4 items 1-2
    (:316-318).
  - Each clause of the new paragraph matches a check at :85-103. I compared them one by one: the path predicate, the
    occurrence count, the emit, the literal and count arms, and the TEST_FILES equality.
  - It is a comment, and the test's emit is not a product output.

## 7. Test quality

- **Core rule (:42-43).** Each new arm has a plausible input that makes it fail:
  - W1-W7 and my O1a, O2a, O4a and O5a;
  - every arm's isolation survives: K1-K5, and my O1b, O3, O4b, O5b and O6.

  So no arm is dead weight.
- **Bar 4.** The expected values are literals (`12`, `1`, `''`, `true`, and the hand-copied `RUNNER_TEST_FILES`). The
  runner's list is parsed independently, not imported.
- **Bar 7 (:82-84).** It is met, with one partial:
  - the path, literal, count and duplicate failures name the id, the file or the name (§3.2);
  - TEST_FILES failures print an element diff (§3.4);
  - the length row's message is the bare id list. T7 prints 11 ids and `expected 11 to be 12`, so a reader can see
    which id is missing only by comparing with the plan. That is what the raw's fix text asked for. A prefix such as
    `` `mutation ids: ${ids.join(', ')}` `` would label it. This is optional and not a note.
- **Bar 10 (:93-96).** The change extends the nearest test in place. Net delta `+0 ~13 -0` by `vitest list` names (§3.5).
- **Rule 6 coverage of the PR's own record.** Two of my weakenings survive every row in the PR's record:
  - O2b, a case-insensitive count, survives because no row varies case;
  - O5b, `%` only before a letter, survives because Q11's `%s` is still refused.

  My O2a and O5a are the inputs that pin those two arms. Adding them to `test_mutants.py` would make the record catch
  both weakenings. This is optional and is not raised as a note, since neither weakening is in the bytes.
- **Robustness.** No new code runs at describe time. `runnerTestFiles` is called inside the first `it`, and
  `getText()` has the parent pointers it needs (`createSourceFile(…, true)`).

## 8. Cleanup

- **Deleted:**
  - the scratch clone `rev-550/clone`;
  - the private TMPDIRs `/tmp/r550-1` … `/tmp/r550-6`. `ls -d /tmp/r550-*` then counts `0`;
  - the `npm ci` and typecheck logs and my copy of the PR body.
- **The working tree** had `0` porcelain lines after every mutant run, with one exception, the `bd` lock in §3.2,
  which I deleted.
- **Not touched:** no PR, branch, comment, workflow, bead or `.worktrees/` checkout.
- **Kept under `rev-550/`:** the 21 files below, besides this raw. None is over 300,000 bytes. The largest is
  `full-suite.log`, at 299,696 bytes. The U+00A0 sweep over every kept text file found none.

| Path | sha256 |
|---|---|
| `emit-compare.txt` | `885e48d6ba7f56ca4dc294c363dc99006fcbbc9ebadc5506290a1d98d04a383f` |
| `full-suite-load.txt` | `9acc103afe15c42ada7553ff59bf137c8b83c93fcf89fa0df1285a788e59a171` |
| `full-suite.log` | `0a7dd7cdc371c4a47cd327ff940a053ac7774c877334d80de1c60d9cc673d1a3` |
| `list-base.txt` | `553654eee891099b70cf53629d287c2b894e86502c4a7223cd31f6ac51a36670` |
| `list-head.txt` | `553654eee891099b70cf53629d287c2b894e86502c4a7223cd31f6ac51a36670` |
| `own-mutants-run.log` | `b7daac81c7c4849fa017cffaa97139305b6cb429eef238bcdf72dae634dffa6d` |
| `own-mutants.json` | `95a57422aa8be1e1f36fa7a9baaa4d1b4e54d45e759f42173807d10e5a143d9a` |
| `rerun-alone-base.txt` | `5c884188d7070dc520d3c95854df2c5b8e33dbcb582c0d1f6e083d6f3cfac873` |
| `rerun-alone-head-2.txt` | `b1cfe7876ec85d573e9b47fdbbdf8056961b0219095f97aa2fe9b33a30237b39` |
| `rerun-alone-head-3.txt` | `070189ae3d1272998123666c3615a27f3e979ed86657b069123701bbfe7885e5` |
| `rerun-alone.txt` | `d6fafe4341a7665acbafd6838a6e8b19dbb045bec27a38ff46dac32f255f5cb7` |
| `rerun-timeout-head.txt` | `c9c635659f465cedaa74f6958b050ba0f5801ef2093752ca1a5e3481c03b060a` |
| `test-mutants-at-5cf4223a.json` | `97d655887c352174a6117e7bff6187afdd8140ec8a12751aa41db75665f01b4f` |
| `test-mutants-run.log` | `ad44864fa12066c244f49b7cb1361b763ceb15678033950869f4d43ef8af68ea` |
| `tm-load.txt` | `140ec406da2a2aaed27ddc6d01cf80e0fda128f05623bd095a628b1808be9da7` |
| `tools/emit_compare.cjs` | `49cb7a0f2b4f317b2684fcfdf7a2e75c21d973ae566bbd72d8bfd5d7680d1136` |
| `tools/n5_probe.py` | `4163cfec721850b10f849d83fc533961b5ca8a6f74e6a38c912c4c70347d9b93` |
| `tools/own_mutants.py` | `460a8affd1d56df1c6cebcfebdd31e99ca34c8f186b47c8a2e3177249cb0b582` |
| `tools/rerun_alone.sh` | `1bb32f9ae2167039b22c8e30e8bbd692e70b4516d99aabcfd236946b6eb8d04c` |
| `tools/rerun_timeout.sh` | `4255c62a8dde71704bfc3c76af2afcf3e2af1b98423ebf0b4401e2644ee4cd05` |
| `tools/w7_probe.py` | `e83e0930f5289fdbeeabc54a9d49fa32c3778b7bae4c36af3dee6bd6f221c9be` |
