# R-GP-IMPL-FENCE-RULES-2 — CC-REV-1 implementation review of syzygy-bpyt.6.3 stack 3, round 2
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 815d93bb
Subject: r2-review.diff sha256 50d388a75a5339893ec2ae225b2833d6aafe18eec16e16ebedb2e25111bc246f

Reviewer: an independent, fresh-context reviewer that did not author the change. Scope: the round-1 repair delta,
`git diff af534d6e 815d93bb`, read against round 1's raw (`R-GP-IMPL-FENCE-RULES-1-RAW.md`, sha256 `4fba7d5e…`). No target
repository content was fetched or read. Every input I fed a reader is a synthetic fixture written in my tools, or a file of the
Syzygy repository at the commit named. Scratch root `rev-533b/` is
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-533b/`. I ran everything in three
scratch clones of the repository, which are now deleted.

Verdict reason, in one line: every round-1 blocking finding (F1, F2) and every routed note (N1, N4-N10) is resolved as round 1
asked; each GAP pin flips under a fix of its own direction and only that direction; no production byte changed; the full
vitest suite passes at the reviewed commit and on a local merge with `d38d7a3c` (raised timeouts; the default-timeout failures
are load timeouts only, section 3); nothing a gate accepts or refuses changes. The seven new findings are notes.

## 1. Subject identity checks

- [Observed] `sha256sum r2-review.diff` gives `50d388a75a5339893ec2ae225b2833d6aafe18eec16e16ebedb2e25111bc246f`, and
  `git diff af534d6e 815d93bb | sha256sum` gives the same digest. `git diff --shortstat af534d6e 815d93bb` prints
  "18 files changed, 5231 insertions(+), 141 deletions(-)". **Match.**
- [Observed] The whole PR, `git diff f7477f52 815d93bb | sha256sum`, gives
  `93a98321d52803de6a0dba2a522555da5cec359f6b3ac19f7e1b2536b2b062ae`, with "32 files changed, 12673 insertions(+), 5
  deletions(-)". **Match.**
- [Observed] Branch heads fetched from `https://github.com/Tzeusy/syzygy.git`: `agent/syzygy-bpyt.6.3-fence` =
  `815d93bb2315bf535ae4a7244eac2efd229fc025`, `main` = `d38d7a3ce632a34c2a41bdb77ad323ba0b05b777`. `gh pr view 533` gives
  headRefOid `815d93bb…`, baseRefName `main`, state `OPEN`, mergeable `MERGEABLE`.
- [Observed] Commit chain: `815d93bb` has parent `ba7fce36`, which has parent `af534d6e`. `af534d6e` has parents `9d9c98a6`
  and `f7477f52`. `git diff --name-status af534d6e 815d93bb` gives 13 `A` and 5 `M`.
- [Observed] **`af534d6e` is git's own merge, path for path.** `git merge-tree --write-tree 9d9c98a6 f7477f52` exits 0 and
  prints tree `5d089d8c2868a7268b963cc35f4044ec4d5e66e0`; `git rev-parse af534d6e^{tree}` prints the same tree, and
  `git diff-tree -r --name-only` between the two lists 0 paths. `git ls-tree -r -z --name-only af534d6e` lists 5,462 paths,
  the figure the record states.
- [Observed] **Main has moved.** `git log --first-parent f7477f52..d38d7a3c` lists `9dba2589` (#535), `bb05df7e` (#536)
  and `d38d7a3c` (#487). `git diff --name-only f7477f52 d38d7a3c` lists 238 paths (`main-since-f7477f52.txt`). `comm -12`
  against the PR's 32 paths prints nothing: **0 overlap**. Second method: my local merge `1a47f15e` (parents `815d93bb`,
  `d38d7a3c`, no conflicts, tree `f45e04bb…` equal to `git merge-tree --write-tree 815d93bb d38d7a3c`) differs from
  `d38d7a3c` in exactly the PR's 32 paths (`diff` of the two sorted lists is empty).
- [Observed] **Production files.** The five production files have the same blob at `9d9c98a6`, `af534d6e`, `ba7fce36` and
  `815d93bb` (20 of 20 equal; `r2-check-record.json`), and the same blob at `f7477f52` and `d38d7a3c` as at `a5ab2b28`:

  | file | blob at the four repair commits | blob at f7477f52 and d38d7a3c |
  |---|---|---|
  | `packages/three-surface-poc-core/src/markdown-code-context.ts` | `895c1951…` | `0a520646…` |
  | `apps/three-surface-poc/src/polaris-markdown.ts` | `b1a52833…` | `b8340ce1…` |
  | `packages/three-surface-poc-core/src/project-shape-extraction.ts` | `95b08f32…` | `93d4f4ae…` |
  | `packages/three-surface-poc-core/src/project-shape-manifest.ts` | `79399a39…` | `c2d2d956…` |
  | `packages/polaris-generation-consent/src/package-reader.ts` | `835cce25…` | `2603a2de…` |

  Of the repair's 18 paths, 0 are non-test `.ts` under `packages/*/src` or `apps/*/src` (script over `repair-paths.txt`);
  the two under `src/` are `fence-rules.test.ts` and `package-reader.test.ts`. Second method: `line-level-check.mjs . af534d6e
  815d93bb` prints "production files changed 0, comment-only (print and lines) 0, not 0".
- [Observed] **Hosted checks at `815d93bb`.** `gh pr checks 533` prints `checks pass 24m15s` and `node pass 4m30s`;
  `gh api …/commits/815d93bb…/check-runs` gives `node completed success 815d93bb…` and `checks completed success 815d93bb…`.

## 2. Clauses relied on (quoted), and the class ruling

CC-REV-1, `.syzygy/governance/policies/craft-and-care/review-and-documentation.md` at `815d93bb`:
- :18-20 "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent
  performing the change never finally decides which classes it touches."
- :31-32 "1. **authority boundaries** — write-universe, typed-authority table, adapter authorization (VIS-5, VIS-6);"
- :35-36 "3. **deterministic observation** — snapshot composition, evaluation identity, the deterministic/inferred seam (VIS-7);"
- :37 "4. **security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- :40-41 "6. **public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
- :51 "**A reviewer or the owner** may reclassify at any time."

GP-Q0, `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md` at `815d93bb`:
- :52-55 "\"Behavior-preserving\" means none of the following changes:", followed by three list items: "a rendered byte, a
  wire format, a refusal string or an exit code;", "a signed or digest-bound artifact;", "a consent, security or retention
  decision."
- :62 "**Which ones:** pull requests touching class 1 (authority boundaries), class 3 (deterministic observation) or class 4
  (security), and class-6 pull requests that remove an endpoint."
- :95-96 "Any change not listed here to what a gate accepts or refuses stops and returns to the owner."

`AGENTS.md` at `815d93bb`, verification rule 6 (:126-127): "Mutate the input and confirm the check fails, per predicate, before
trusting it"; rule 4 (:123): "Read a check's output, not its exit code"; and the guardrail at :388-389: "A page that restates
state it does not own goes stale silently. Cite `PROJECT-STATUS.md` or the act record instead of repeating the row."

The test-rigor bar, `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` at `815d93bb`, quoted in section 7.

The module invariant G2 rests on, `packages/three-surface-poc-core/src/project-shape-extraction.ts:16-17` at `815d93bb`, a
comment wrapped across the two lines: "A source never yields a partial item set." (unchanged blob, so unchanged text since
round 1).

Every quotation above, and the line-cited quotations in sections 4 and 5, were checked against `git show 815d93bb:<path>` by
`tools/r2_quote_check.py` and `tools/r2_phrase_check.py` (whitespace and `//` markers normalized).

**Class ruling (mine).** The PR as a whole stays classes 1, 3 and 4, as round 1 ruled: its five production edits are the
round-1 comments, unchanged by the repair. The repair itself adds tests and evidence only: two test files, `AGENTS.md`, and
files under `docs/evidence/syzygy-bpyt-6-3/`. Its new tests pin a class-1 reader (`package-reader.test.ts`, the owner-act
consent reader), class-3 readers (extraction, index links) and the class-4 gate's profile (`whole` column), so the class-1/3/4
obligations GP-Q0 :62 names still apply to the PR. Class 6: none. [Observed] The new tests use only exports that already
exist at `f7477f52` (`extractSource` is exported through `export * from './project-shape-extraction.js'`, `index.ts:30`;
`createPackageAdmissionReader` was imported by the test file before), and no production file changed. Classes 2, 5 and 7: none.

**GP-Q0.** [Observed] Nothing a gate accepts or refuses changes: the five production blobs are unchanged by the repair (20 of 20
equal); the probe built at `f7477f52` and at `815d93bb` gives 66 cases with 0 differing, 0 inline rows differing and the
consent function's text equal; the emit-equal and line-level checks give 5 of 5 over `f7477f52..ba7fce36`. The stop clause
(:95-96) is not engaged by this PR.

## 3. What I ran, and the results

All in scratch clones at `815d93bb` (and at `f7477f52` for the base probe, and on the local merge `1a47f15e`), each after
`npm ci` (`added 117 packages`, exit 0), with private TMPDIRs `/tmp/r533b-1`, `-2`, `-3`.

1. **Identity checks** (section 1).
2. **Full vitest suite at `815d93bb`** (`npm run build` exit 0 first).
   - Default timeouts, load average 50-67: "Test Files  5 failed | 238 passed | 3 skipped (246)", "Tests  6 failed | 5347
     passed | 70 skipped (5423)". All 7 failures are timeouts: 6 "Error: Test timed out in 5000ms." in `polaris-dossier`'s
     `close`, `gate-acts` (2), `run-evidence` (2) and `start-gates`, and 1 "Error: Hook timed out in 10000ms." in
     `act-families.test.ts`. None is a PR path. Those 5 files rerun alone: "Test Files  5 passed (5)", "Tests  315 passed (315)".
   - `--testTimeout=120000 --hookTimeout=120000`, two runs at load 50-72: each "Test Files  1 failed | 242 passed | 3 skipped
     (246)", "Tests  5353 passed | 70 skipped (5423)". The one failure each time is `act-families.test.ts`'s `beforeAll`,
     "Error: Hook timed out in 10000ms." (the CLI flag does not reach that hook). Alone, `act-families.test.ts` gives
     "Tests 65 passed (65)" twice, and the whole consent package "Test Files 7 passed (7) Tests 507 passed (507)".
   - The same raised-timeout command, a third run at load 33-50: **"Test Files  243 passed | 3 skipped (246)", "Tests  5418
     passed | 5 skipped (5423)", exit 0.**
3. **Full vitest suite on the merge `1a47f15e`** (`npm run build` exit 0).
   - Default timeouts, load ~70: "Test Files  7 failed | 237 passed | 3 skipped (247)", "Tests  27 failed | 5343 passed | 70
     skipped (5440)". All 28 failure blocks are timeouts (27 "Test timed out in 5000ms", 1 "Hook timed out in 10000ms"), in 7
     files: `polaris-dossier`'s `close`, `execution-flags`, `gate-acts` (20), `run-evidence` (3), `start-gates`, and the consent
     package's `act-families` (hook) and `digest-bound-act`. None is a PR path. The 7 rerun at default timeouts, load 77: 6
     failed again, every failure line a timeout. Rerun with raised timeouts: "Test Files  7 passed (7)", "Tests  370 passed (370)".
   - Raised timeouts, whole suite: **"Test Files  244 passed | 3 skipped (247)", "Tests  5435 passed | 5 skipped (5440)",
     exit 0.**
   - [Inferred] The default-timeout failures are host load (load average 50-80 on 12 cores, other sessions running), not the
     change: every one is a timeout, none is in a file the PR touches, each file passes when rerun, and hosted `node` passes
     at `815d93bb`.
4. **`npm run typecheck`**: exit 0 at `815d93bb` and exit 0 on the merge.
5. **`python3 scripts/check_governance.py`**: exit 0 at `815d93bb` and on the merge, each "32 OK, 21 WARN, 0 FAIL (53 checks) —
   counts derived, not asserted". The hits naming a PR path are the pre-existing `AGENTS.md` word-count warnings (lines
   994-999 of the log).
6. **`python3 scripts/check_quotations.py`**: exit 0 at `815d93bb` and on the merge.
7. **`fence-rules.test.ts` with `package-reader.test.ts`, 5 runs at `815d93bb`**: each "Test Files 2 passed (2) Tests 360
   passed (360)" (57 + 303).
8. **The probe, base against head.** Built at `f7477f52`, `fence-probe.mjs` output sha256 `08cb1074…`; built at `815d93bb`,
   `95ed7f66…`. Each is byte-equal to its tracked file. `compare-fence-probe.py` exits 0 with `"casesCompared": 66`,
   `"casesThatDiffer": 0`, `"inlineCasesThatDiffer": []`, `"consentFunctionTextDiffers": false`. Tool digests `10b6d88b…` and
   `eb498c1a…` equal the record's.
9. **Comment-only and line-level checks.** Over `f7477f52 ba7fce36`: `comment-only.mjs` prints "production files changed 5,
   comment-only 5, not 0" and `line-level-check.mjs` "production files changed 5, comment-only (print and lines) 5, not 0",
   both exit 0, both outputs byte-equal to the tracked `repair1-*` files. `--selftest` exit 0, output byte-equal to
   `repair1-line-level-selftest.json`. **Negative controls re-made from the record's `old`/`new`** in a scratch commit on
   `815d93bb`: the type-only edit gives line-level "…4, not 1" exit 1 and emit-equal "…5, not 0" exit 0; the code edit gives
   "…4, not 1" exit 1 from both; PR 1's range `a088f1ca 9029e1cf` gives "production files changed 59, comment-only (print and
   lines) 0, not 59", exit 1, its JSON equal to the tracked one apart from short against full commit ids.
10. **The record, by script against the git objects** (`tools/r2_check_record.py`, `r2-check-record.json`): 25 of 25 checks OK.
    Subject commits resolve; the merge's parents and 5,462 paths; `testedCommit` is the reviewed commit's parent; the round-1
    raw's sha256; the sha256 of `repair1-comment-only-…json`, `line-level-check.mjs` (`43ed6091…`),
    `repair1-line-level-…json`, `fence-probe-output.json` (`95ed7f66…`) and `repair1-probe-base-vs-head.json`; the five blobs;
    26 mutant rows, each `old` occurring once at `ba7fce36`, each verdict naming exactly the detectors whose `killed` is true,
    each `failedCount` equal to its `failed` list and its summary line, each probe `killed` agreeing with its differing counts;
    no mutant `commit` resolves (as `commitNote` says); and the summary's `killedByATest` 26, `killedByTheProbeOnly` [],
    `survived` [] and `newlyKilledByTheRepair` (6 ids) re-derived from the rows.
11. **The record's 26 mutants re-run from `old`/`new`** against the committed tests at `815d93bb`
    (`tools/r2_record_mutants.py`, `r2-record-mutants.json`): `"allAgree": true`, `"treeCleanAfter": true`. Each consent row
    fails exactly 1 `package-reader.test.ts` test; E4, L5 and L6 fail 8, 9 and 9 `fence-rules.test.ts` tests.
12. **Round 1's reproducers, re-run at `815d93bb`** (section 4): `tools/extra-probe.mjs`, `tools/zz-rev533-consent.test.ts` and
    `tools/own_mutants.py`.
13. **My mutants**: 14 against the readers and the new tests (`tools/r2_mutants.py`, `r2-mutants.json`), 6 against the new
    tool (`tools/r2_tool_mutants.py`, `r2-tool-mutants.json`), and a consent probe under two of them
    (`tools/zz-rev533b-consent.test.ts`, `tools/r2_consent_probe.py`, `r2-consent-probe.json`). Each was applied in the working
    tree only and restored; every run ends with `"treeCleanAfter": true`. Results are in sections 4, 5 and 7.
14. **The tool's argument handling** (N1, N2): a scratch commit `939a7c33` on `815d93bb`, and invocations through a symlink and
    a path with a space.
15. **A manifest probe for G3's hide direction** (`tools/g3-manifest-probe.mjs`, `g3-manifest-probe.json`; N5).

## 4. Each round-1 finding, and whether it is resolved

| id | round 1 asked | what the repair did | reproducer at `815d93bb` | resolved |
|---|---|---|---|---|
| F1 | restate G2 truly in the record and PR body; pin an extraction row with items after such a fence | G2 `what`, `directions`, `decision` and `pinnedBy` rewritten; PR body G2 bullet rewritten; `GAP G2` (4 tests) | `extra-probe.mjs` output byte-equal to round 1's (`55c57626…`): `g2IndentedCloserReach` `["First."]` against 3, `g2TabCloserReach` `["First."]`. Still reproduces, as it must (no fix); now pinned by literal | **Yes** |
| F2 | add the multi-line-span and hide directions, correct the tab direction, replace the PR body's cause, add a multi-line row | G3 directions `spanThatRunsAcrossLines`, `hidesLaterLinks`, `singleLineDoubleBacktickSpan`, corrected `closerWithTrailingTab`; PR body (1)-(5); `GAP G3` (6 tests) | `g3MultiLineSpan` 3 of 3 `links: "V"`, `g3CloserShapedLineHides` `links: []`. Still reproduce; now pinned | **Yes** (N5 adds evidence) |
| N1 | restate `G4.reading`; optionally commit both CRLF refusals | `G4.reading` restated with the mechanism; two CRLF refusals in `package-reader.test.ts` | round 1's consent probe gives the same 5 rows as at `9d9c98a6` (`r1-consent-probe-at-815d.txt`). Under the record's N1a, my probe shows a CRLF act record whose `Date:` line sits wholly inside a fence read as `in-force`; the LF control is refused (`r2-consent-probe.json`), so the restated mechanism is right | **Yes** (N4 on wording) |
| N4 | kill K1 and K2 by a committed test, no export | two public-reader tests | K1 and K2 each fail 1 `package-reader.test.ts` test (`r2-record-mutants.json`); my KC1 (any indent) and KC2 (shorter closer) are killed too | **Yes** |
| N5 | "pins four of them"; name the ruling or leave it to the record | bullet edited (`AGENTS.md:196-199`); G1 `GAP:` comment rewritten | `AGENTS.md:196` "pins four of them (the consent reader through the probe and its own tests)" | **Yes** (N6 on status) |
| N6 | rename the claim, or add the line-level check | `claimName` "emit-equal (runtime-equal)"; `line-level-check.mjs`; both run with negative controls | round 1's type-only mutant passes the emit check and fails the line-level check (item 9) | **Yes** (N1-N3 on the new tool) |
| N7 | reason column on `CASES`; tab-indented renderer pin | `whole`/`wholeCrlf` on 33 rows; `renderer: a fence line indented with a tab does not end a paragraph` | `own_mutants.py` at `815d93bb`: RV7 "killed by newTest" (1 failed, the tab pin); RV11 "killed by newTest, existing" (`'list-item'` fails on `whole`). My WR1 (reason swap) fails 2 rows on `whole` | **Yes** |
| N8 | inline field per probe row; name scratch commits; uncap `failed`; tracked expected output | all four | 26 of 26 probe rows carry `inlineCasesThatDiffer`; L4 reads `casesThatDiffer` 0 with 2 inline ids; `commitNote` present and 0 of 26 commits resolve; every `failed` list equals `failedCount`; `expectedProbeOutput` is the tracked path with `95ed7f66…` | **Yes** |
| N9 | "on the 25 fence-only cases" | `readers[4].reading` rewritten; PR body likewise | text read at `815d93bb` | **Yes** |
| N10 | drop or derive the literal count | `toHaveLength(14)` removed | absent from the file | **Yes** |
| N2, N3, RV10 | routed to `syzygy-bpyt.16` | listed in `roundOneRepair.notRepairedHere` | RV10 still "SURVIVED" at `815d93bb`, as routed | not here, by routing |
| N11 | coordinator note | #530 merged; noted in the record | — | moot |

**The GAP pins** (`r2-mutants.json`). [Observed] Each fix flips the GAP rows of its own direction and no other GAP row, and no
control row:

| my mutant | what it fixes | GAP rows that fail | other `fence-rules.test.ts` rows that fail |
|---|---|---|---|
| FX1 `line.replace(/^ {1,3}/, '').trimEnd() === fence` | G2, indented closer only | `GAP G2` one space, three spaces (2) | `closer-indent1`, `closer-indent3`, CRLF equality |
| FX2 closer allows trailing spaces only | G2, tab line only | `GAP G2` tab row (1) | `closer-trailing-tab`, `closer-trailing-tab-then-closer`, CRLF equality |
| FX3 a span across lines is blanked, run lengths matched | G3, multi-line spans only | `GAP G3` the three span rows (3) | `backtick-indent4`, `two-backticks`, `blockquote`, 2 inline rows, CRLF equality |
| FX4 the closer needs only spaces after its run | G3, early close and hide only | `GAP G3` hide row and tab row (2) | 5 closer rows, CRLF equality |

The record's own E4, L5 and L6 (re-run, item 11) also fail their GAP rows (3, 2 and 3). Every GAP literal is a hard-coded
value (`{ principle: 1 }`, `['First.']`, `['probe.md']`, `[]`, `['mint.md']`, the rendered HTML strings).

**Worse, not fixed** (`r2-mutants.json`). [Observed] A pin catches each; the GAP rows themselves catch only WS5:
- WS1, the extractor closes a backtick fence on a tilde line (a further early close): 5 failures, all vector rows
  (`opener-four-closer-three`, `closer-other-char`, `tilde-fence-backtick-line`, `tilde-opener-four-closer-three`, CRLF equality).
- WS2, the extractor's opener matches anywhere in a line (a further hide): 10 failures, all vector rows.
- WS3, the link reader's closer ignores the fence character (a further early close, then a hide): 3 failures, vector rows.
- WS4, the link reader's inline strip is greedy (a further hidden link on one line): 3 failures, inline rows (`link-between-spans` among them).
- WS5, the link reader drops the line after a closer (a further hidden link): 29 `fence-rules.test.ts` failures (the `GAP G3` tab row among them) and 1 in `project-shape-manifest.test.ts`.

**Honesty of the restatement.** [Observed] The record's G2 says "a silent partial item set under a known denominator" and
quotes the invariant it contradicts; the PR body says "**This does not always fail closed.**" and "a partial item set under a
known denominator"; the `GAP G2` test names say "the denominator is 1 of 3". G3 says, in the record and the PR body, that "a
hidden link removes the file it names from the manifest population", with an honest `[Unknown]` on what downstream reports
(N5 narrows it). Neither implies a fix or a ruling: the record's G2 and G3 `decision` fields (lines 882 and 901) end "Not changed
here; a fix flips the GAP G2 rows." and "… the GAP G3 rows."; the PR body says "a future fix to G1-G3 fails them by design: each
such change goes through the owner"; the test comments say "recorded and not decided (an open owner question …)"; and the PR
body's conditional ("if it does, the partial set is a defect, not a refusal") leaves the ruling to the owner. This matches the open decision bead `syzygy-bpyt.1.15` (read-only `bd show`: status
`open`); I do not rule on it.

**Scope.** [Observed] Every changed key of the record (a key-by-key diff of the JSON between `af534d6e` and `815d93bb`) and
every hunk of the two test files, `AGENTS.md` and `fence-mutants.py` maps to F1, F2, N1 or N4-N10, or to the merge round 1's
coordinator note required (`subject.mergeOfMain`, `testedCommit`). Nothing outside them changed. The new `line-level-check.mjs`
is N6's "or add the line-level check beside it".

## 5. New findings

All seven are notes. None changes a reader, a pin's literal, a gate decision or a figure an owner question rests on.

### N1 — note: `line-level-check.mjs` (and `comment-only.mjs`) misread a range that holds a rename, and then pass it.

- **Severity.** Note. The PR's own ranges hold no rename, so its results stand. The tool is new evidence tooling meant to be
  reused (the record calls it the second method for "comment-only").
- **Evidence.**
  - `line-level-check.mjs:144-146` parses `git diff --name-status -z` two tokens at a time (`for (let i = 0; i < changed.length;
    i += 2)`). A rename or copy entry has three tokens (`R100`, old path, new path), so every later entry is misaligned and its
    path no longer matches the production filter. `comment-only.mjs:18` parses the same way.
  - [Observed] Scratch commit `939a7c33` on `815d93bb` renames `AGENTS.md` and changes `FENCE_OPENER`'s `{0,3}` to `{0,4}` in
    `markdown-code-context.ts`. `git diff --name-status 815d93bb 939a7c33` lists `R100 AGENTS.md AGENTS-renamed.md` and
    `M packages/three-surface-poc-core/src/markdown-code-context.ts`. `line-level-check.mjs` prints "production files changed
    0, comment-only (print and lines) 0, not 0", exit 0, with `changedFiles` 3; `comment-only.mjs` prints "production files
    changed 0, comment-only 0, not 0", exit 0.
  - [Observed] The PR's ranges hold no `R` or `C` entry: `-z` token counts are exactly twice the entry counts for
    `f7477f52..ba7fce36` (20), `af534d6e..815d93bb` (18), `a088f1ca..9029e1cf` (81), `fe3855a1..7e58cd1f` (11) and
    `f7477f52..815d93bb` (32).
- **Failure scenario.** A later PR reuses the tool over a range that also moves a file. A code change in a production file
  sorted after the rename is never checked, and the tool reports "not 0" with exit 0.
- **Proposed fix.** Pass `--no-renames` (and refuse any `R`/`C`/`T` status), or parse three tokens for `R`/`C`; add a selftest
  case that runs `main` over a scratch repository with a rename. Apply the same fix to `comment-only.mjs`.

### N2 — note: `line-level-check.mjs` run through a symlink or a path with a space does nothing and exits 0.

- **Severity.** Note. Rule 4 ("Read a check's output, not its exit code") mitigates it, and the lane read the output.
- **Evidence.** `line-level-check.mjs:170` runs `main()` only when `import.meta.url === \`file://${process.argv[1]}\``.
  `import.meta.url` is the real path, percent-encoded; `argv[1]` is the path as given. [Observed] Copied under
  `docs/evidence/dir with space/`, `--selftest` printed 0 bytes and exited 0, and the range `815d93bb 939a7c33` (a code change)
  exited 0 and wrote no output file. Through a symlink, `--selftest` printed 0 bytes and exited 0.
- **Failure scenario.** A wrapper or CI step calls the tool through a symlinked checkout and treats exit 0 as "comment-only".
- **Proposed fix.** Compare `realpathSync(fileURLToPath(import.meta.url))` with `realpathSync(process.argv[1])`, or always run
  `main()` (the module is a script); and have `main` fail if it wrote no output.

### N3 — note: the new tool's selftest does not pin each predicate; four of my six mutants survive it.

- **Severity.** Note. Rule 6 asks for a failing mutation "per predicate". The tool's result on the PR's range is confirmed
  independently (emit-equal 5 of 5; my own reading of the five one-line comments in round 1).
- **Evidence** (`r2-tool-mutants.json`). [Observed] Selftest "12 of 12" holds under:
  - T2, the print predicate switched off (`const printEqual = true;`). No selftest case has print failing while lines pass
    (`ll-selftest.json`: every case with `printEqual: false` also has `linesOk: false`).
  - T3, an unequal-count hunk accepted whatever it holds (`ok = ok && onlyComment;` to `ok = ok;`). On my probe "statement
    reflowed across two lines" (`return g(a, b);` to `return g(a,\n    b);`), the unmutated tool says `false` and T3 says
    `true`: the reflow is print-equal, so only the lines predicate refuses it, and no selftest case exercises that branch alone.
  - T4, a comment range's end made inclusive. Masked by the print predicate on my probe.
  - T6, the production filter dropping `apps/`. The selftest covers `check()` only, never file selection; on the PR's range the
    output becomes "production files changed 4".
  - T1 (equal-count lines check off) and T5 (no trailing trim) are killed by the selftest.
- **Failure scenario.** A later edit breaks one predicate; the selftest stays 12 of 12 and the tool is trusted on a range where
  only that predicate would have refused.
- **Proposed fix.** Add a selftest case for each predicate alone: a reflowed statement (lines must refuse, print passes); a case
  where print refuses and lines pass, or a sentence saying none exists and print is the redundant second method; and a
  `main`-level case over a scratch repository (the filter, an added file, a rename).

### N4 — note: two sentences say the consent pins cover more than they do.

- **Severity.** Note. G4 is note-severity, and no CRLF path opens today.
- **Evidence.**
  - `fence-rules.test.ts:9` says `package-reader.test.ts` "pins its opener, its closer and its CR-blindness". [Observed] KC3
    (the fence guard made CR-tolerant, `(.*?)\r?$`) passes all 303 `package-reader.test.ts` tests. The package file's own
    comment (`package-reader.test.ts:153`) says the CRLF cases "pin that refusal, not the mechanism", which is right.
  - The PR body: "Both refusals are committed tests, so a change that made those checks CR-tolerant fails them before it opens
    the field-inside-a-fence path", where "those checks" are the title (`:700`), table (`:188-189`) and heading (`:153`)
    checks. [Observed] KC4 (the `sectionList` heading check `:153-154` made CR-tolerant) passes all 303 tests. It opens nothing:
    a CRLF egress instance bound by its own digest is still refused under KC4 (`r2-consent-probe.json`), [Inferred from the
    code] by the `$`-anchored item patterns at `:202-203`. So the heading check is neither pinned nor the only barrier, and no
    committed test reads a CRLF egress instance.
- **Failure scenario.** A later reader trusts the header and believes a CR-tolerant fence guard, or a CR-tolerant egress
  reading, would fail a committed test.
- **Proposed fix.** Reword `fence-rules.test.ts:9` to "pins its opener, its closer, and the refusal of a CRLF act record and a
  CRLF observation instance"; limit the PR body's and the record's "those checks" to the title and table checks the tests pin;
  optionally add a CRLF egress-instance refusal test (it fails today only through `:202-203`).

### N5 — note (for the `syzygy-bpyt.1.15` owner packet): G3's manifest-level `[Unknown]` can be stated as Observed.

- **Severity.** Note. The record's statement is true; this narrows its Unknown and strengthens the question it feeds.
- **Evidence.** [Observed] `g3-manifest-probe.json`, through `deriveProjectShapeManifest` on a synthetic in-memory tree: a
  root index `about/README.md` linking `heart-and-soul/README.md`, whose pillar index links `vision.md`, then a fence, then
  `lore.md`.
  - With a plain fence: the pillar is `"state": "discovered"`, `"namedSources": 2`, sources `lore.md` and `vision.md`.
  - With a closer-shaped line carrying `js` inside the fence (the profile reads it `masked`, with the `lore.md` link visible):
    `"state": "discovered"`, `"namedSources": 1`, `"ignoredLinks": []`, and only `vision.md` among the sources.
  - So the manifest reports the shrunk population as discovered, with no ignored-link entry or other signal
    (`project-shape-manifest.ts:488` counts `namedPaths.size`).
- **Failure scenario.** The owner packet carries G3's "[Unknown] whether anything downstream then reports that file as
  missing" (the PR body; the record's `hidesLaterLinks`, line 898, says "the file") and the owner weighs the hide as possibly reported, when at the manifest it is not.
- **Proposed fix.** In the `syzygy-bpyt.1.15` packet, state the manifest-level reading as Observed with this fixture, and keep
  `[Unknown]` only for consumers beyond the manifest. No change to this PR is needed.

### N6 — note: the `AGENTS.md` bullet now restates bead status it does not own.

- **Severity.** Note. Round 1's N5 offered this wording as one of two options.
- **Evidence.** `AGENTS.md:198-199`: "G1, the CRLF reading, is ruled by the owner (`syzygy-bpyt.1.14`) and `syzygy-bpyt.16`
  fixes it; G2 and G3 are open owner questions." Both clauses go false on events outside this PR (bpyt.16 landing; bpyt.1.15
  ruled). The same file's guardrail (`:388-389`): "A page that restates state it does not own goes stale silently."
- **Failure scenario.** bpyt.1.15 is ruled and the bullet still says "open owner questions"; a session stalls on a decided
  question.
- **Proposed fix.** Put "edit the `AGENTS.md` fence bullet" in the acceptance criteria of `syzygy-bpyt.16` and of whichever
  bead implements the bpyt.1.15 ruling; or shorten the bullet to route to the record and the beads.

### N7 — note: four wording slips, none in a figure.

- **Evidence.** [Observed]
  - (a) The record, `roundOneRepair.items[N5].what` (`dc3-fence-rules-2026-10-25.json:4047`), says the bullet "pins four of the
    gaps"; the bullet says four of the five readers ("pins four of them").
  - (b) The PR body: "byte-equal to the tracked ones (`95ed7f66…`, `08cb1074…`), which were produced at `fe3855a1` and
    `7e58cd1f`". The pairs are reversed: `95ed7f66…` is the head output (`7e58cd1f`), `08cb1074…` the base (`fe3855a1`).
  - (c) The PR body and `subject.mergeOfMain.mainMovedTo` say main moved to `bb05df7e`; it is now `d38d7a3c` (#487 too). The
    record scopes it "while this repair ran", which stays true.
  - (d) `fence-rules.test.ts:195-196`, a comment wrapped across the two lines: "A fix flips the two rows below"; the describe holds three non-control rows (the
    `it.each` pair and the tab row), and FX1/FX2 show they flip separately.
- **Failure scenario.** A reader re-checking the pairing in (b) matches the wrong digest to the wrong commit.
- **Proposed fix.** Correct on the next touch of each file; (b) and (c) are PR-body edits only.

## 6. Every changed output, or the evidence that there is none

[Observed] None changes.
- **Production code.** No production file changed in the repair: 0 of 18 repair paths, and the five blobs equal at
  `9d9c98a6`, `af534d6e`, `ba7fce36` and `815d93bb`. Over the whole PR the five edits are emit-equal 5 of 5 and line-level
  5 of 5.
- **Reader behaviour.** The probe at `f7477f52` and at `815d93bb`: 66 cases, 8 inline rows and the consent function's text,
  0 differing; both outputs equal the tracked ones.
- **Rendered bytes.** [Inferred from emit equality and unchanged blobs] None change.
- **Governance.** `check_governance.py` 0 FAIL and `check_quotations.py` exit 0, at the reviewed commit and on the merge.
- **Additions.** 13 new evidence files under `docs/evidence/syzygy-bpyt-6-3/`; 15 new tests (11 in `fence-rules.test.ts`, 4 in
  `package-reader.test.ts`) and 34 changed instances (the 33 `CASES` rows and the CRLF-equality test), as the PR body's
  "+15 ~34 -0" says; one `AGENTS.md` bullet edited.
- **Bound files.** The repair touches no file under `.syzygy/**` or `openspec/**`, and no registry-bound file
  (`git-object-reader.ts`, `project-shape-observer.ts` are not among the 32 PR paths).

## 7. Test quality

Measured against `.claude/skills/th-engineering/subskills/test-rigor/SKILL.md` at `815d93bb`:
- **:42-45** "A test is worth keeping only if some plausible bug makes it fail." Met. Each new GAP row fails under a fix of its
  direction (FX1-FX4, E4, L5, L6); the tab renderer pin fails under RV7; the `whole` column fails under RV11 and WR1; the
  consent describe fails under K1, K2, N1a, N1b, KC1. RV7, RV11, K1, K2, N1a and N1b pass the tests of `9d9c98a6` (record
  `prior` rows), so the repair adds protection that was not there.
- **:52-54** "Tests pin observable outcomes … A pure refactor should not break tests; a behavior change must." Met. The rows
  call public exports (`extractSource`, `indexLinkTargets`, `maskMarkdownCodeContexts`, `renderPolarisMarkdown`,
  `createPackageAdmissionReader`) and compare outcomes: denominators, keys, link lists, rendered HTML, in-force states,
  refusals.
- **:60-63** "**Edge and failure paths are first-class** — Empty inputs, boundaries, invalid states, error branches, and
  concurrency-sensitive paths get tests proportional to blast radius." Met for the shapes round 1 named: the indented and tab closers, the three
  multi-line spans, the hide, CRLF records. The gaps left are N4's (no CRLF egress-instance refusal; the consent CR-blindness
  itself unpinned, by the file's own statement) and, for the new tool, N1-N3.
- **:64-67** "Expected values are literals or independently derived." Met: every new expectation is a literal, and the
  literal-count assertion round 1 named (N10) is gone.
- **Determinism.** 5 of 5 runs gave 360 of 360 for the two files.
- **Worse mutants.** All five are caught, by the vector and inline rows (WS1-WS4) or also by a GAP row (WS5): the GAP rows pin
  today's departures, and the vector corpus pins everything else.
- **Survivors of my mutants**, by name: KC3 and KC4 survive `package-reader.test.ts` (N4); T2, T3, T4 and T6 survive the tool's
  selftest (N3). RV10 survives everything and is routed to `syzygy-bpyt.16`.

## 8. Cleanup

**Deleted.**
- The three scratch clones (`rev-533b/clone`, `rev-533b/clone2`, `rev-533b/clone3`), including the scratch commits
  `939a7c33`, the negative-control commits and the merge `1a47f15e` in them.
- My TMPDIRs `/tmp/r533b-1`, `/tmp/r533b-2` and `/tmp/r533b-3`.
- Copies of round 1's tools I did not run (`check_mutants.py`, `check_record.py`, `k_pin_mutants.py`, `line_check.py`).

Nothing was edited under `/home/tze/GitHub/syzygy` or any of its worktrees. No push, PR comment, merge or bd mutation was made;
the only bd command was one `bd show syzygy-bpyt.1.15`. No process was killed.

**Kept, under `rev-533b/`.** No file is over 300 KB.

| file | sha256 |
|---|---|
| `act-families-815d-isolated.log` | `acd408fa6c6c9107f8e0d52610b922a38ee8d2fa43c72abe72327b962a212681` |
| `build-815d.log` | `4f46afe2ed5e6697e62e362e245332b0fd399cc6e3fff1dafacc438575f104a0` |
| `build-clone2-base.log` | `597b358eb98f417637ea8ee02d8d875627f8aea14c146672ac6e228f81cae5a6` |
| `build-clone2-head2.log` | `597b358eb98f417637ea8ee02d8d875627f8aea14c146672ac6e228f81cae5a6` |
| `build-clone2.log` | `597b358eb98f417637ea8ee02d8d875627f8aea14c146672ac6e228f81cae5a6` |
| `build-merge.log` | `4f46afe2ed5e6697e62e362e245332b0fd399cc6e3fff1dafacc438575f104a0` |
| `check-governance-815d.log` | `98d890bdb4d1409e3ec986f07175593289183ccc11675fc6ec4547304ff86c85` |
| `check-governance-merge.log` | `10e8f262b13be6aa5f0b549fa411756e3e7c05dc09e56f5bb527954d9241bc68` |
| `check-quotations-815d.log` | `1868cba498568e9b17dc851e4827a35a6afba5e06cdbda25be012b2d5d6fdde0` |
| `check-quotations-merge.log` | `7a34ea59919f05b900f1e4c86ff402635584b01388c30cacee8cd936d2ed3093` |
| `extra-probe-815d.json` | `55c57626daa2f1eb5fe37dab0b261bbd097c3116062a75ae09dfae8370c77671` |
| `fence-rules-5x-815d.log` | `d62ba7cbb8e74bd254a42c09b0133372275debaab6451d43466e2cb8472c4879` |
| `g3-manifest-probe.json` | `c04493dd754e22594710def4f5a0f02ff37c6f883eb80eb7d54f4942224965e0` |
| `main-since-f7477f52.txt` | `6495f548605f02f65cd84bbb89cb2732297f1f31cd8b943465dd04ab1674ab6d` |
| `merge-tree-d38d.txt` | `3a76ca2e511e9fd8d5137619e0e3df7c011adefa15e3e8b098e3140f220ecf0d` |
| `merge-vs-main.txt` | `eab5d778833fbea5221be32b43e1db53b4fee07e30cdcfff03c0efadf810cd2d` |
| `npm-ci-1.log` | `a89db0f66e52dae526ecf9c6e0a1e71801f0ac0ae40185274a916a5255ecc087` |
| `npm-ci-2.log` | `df99c6c7794f3c7a0bdf8523d26eb6d3d2ab18a0f93e269ff66c8eb1c8165c93` |
| `npm-ci-3.log` | `ca04792cdab1923de20f5a5f617350b00be3953b4dea6367a7024538d92837c6` |
| `out/co-f74-ba7.json` | `355dcb60db64b5b88e7d7c68e66d69f5744c574c10301a22bb111cbfeaeac024` |
| `out/co-rename.json` | `2170ada22590ed1b062fbb7318a93072b76cc6dbff9364299cc39ef9f4a1df63` |
| `out/compare-base-head.json` | `ae43ec32c59e1c42e72a8e2e2b2ebeba9713e3bb51f7cef4653a4ba0b4f596f3` |
| `out/ll-f74-ba7.json` | `41f1ea885f4fb064ab134f279710e4e9ce2481dcc80dd84feab9e4cbdd50ed3d` |
| `out/ll-link-selftest.txt` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `out/ll-rename.json` | `8c4e7a23d2c1e9c4d4eee8c9165bcf8a0e1514244a898226b1f47223eec4d776` |
| `out/ll-repair-delta.json` | `daf2e19b4efdb9d4cb4d5ffbea4a9c57ed2379c8f282fec088243d1d69264153` |
| `out/ll-selftest.json` | `ff6828397b12dc966c2c7c57289a92f678e701b4c9465e4bb11d42ab1c4589c0` |
| `out/ll-space-selftest.txt` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `out/ll-tool-815d.mjs` | `43ed6091355824ec8d7b089d1c4ef426f8bc8c1c84193070f13a08c0e8b73953` |
| `out/neg-code-co.json` | `cfafd2dd65a0d450625a9270b4ac15602886fe511ccf4f5a87703cd871ae79de` |
| `out/neg-code-ll.json` | `a236863680fa435bba2b991a259b47a747d2332eb8a032a94f184eb8f29f3dfe` |
| `out/neg-pr1-ll.json` | `e24575523ce4756533e6c223dbefd4b880bff07a2c3d8c0a2ad62efa9ee9749b` |
| `out/neg-typeonly-co.json` | `61616a7d56f597c3e19b1b6d870a303fc47ec604c37033ca2c7205620393178a` |
| `out/neg-typeonly-ll.json` | `65c818820d51bc219b5c1ee295480e1533321610e4b0a1d7a587056ad4020c83` |
| `out/probe-base-f747.json` | `08cb10741da79a033248c04e49e1582d414e135a7e6b3054d3d8c1afbd52821c` |
| `out/probe-head-815d.json` | `95ed7f664f202d723b151842acbb9906ed4978e20c1f70971a8bf07ac5c30902` |
| `pr-paths.txt` | `eab5d778833fbea5221be32b43e1db53b4fee07e30cdcfff03c0efadf810cd2d` |
| `pr533-body.md` | `52e9fe4983b74e3a0c45a82ede600cb832fae996818b3b41bd01a8d2bfaba954` |
| `r1-consent-probe-at-815d.txt` | `04af0bb5993dec0912b595b5c50a127603851260c054136b3498a6374306c9ef` |
| `r1-own-mutants-at-815d.json` | `2051411af9b000ee1eaeed64bf6a130f3543a9a2f6795d3e3ca88703f26481ff` |
| `r1-own-mutants-at-815d.log` | `bd298ac005f75958c2b3ca32229053eaa6f13dfccbf10c4ec14a68b2bf9cc86e` |
| `r2-check-record.json` | `562cdf23a90d165a3156ce8663488b67e01a7b41d11e1ae2d410c5959f7944ae` |
| `r2-consent-probe.json` | `829fc3f5088e54bde81e8fe83dfb77ac1a438349fb74cb13de41aea7b6f50eaf` |
| `r2-mutants.json` | `cb38daed00c3036e4b54c4397b18bd9223da8e9b6923675ea3a2f1ac22088a34` |
| `r2-record-mutants.json` | `9650988a114daa391bd58c008530880adb6d42b92be7be76ff8131077d649672` |
| `r2-record-mutants.log` | `d748948af2c26be726cc00789e1a92dbddf92bc303ab7d5eb5f8310aae7231a9` |
| `r2-tool-mutants.json` | `cbfe2c17c8b3322afdc9e04d6ebf9a8f50c45f801412c149ef1bad23b80cc747` |
| `repair-paths.txt` | `9ae203a6e66604866edbfd9b240a3b4e53c93875a19e0815c3186f0deedec47d` |
| `tools/extra-probe.mjs` | `00ca59a11ce7cb2d7d5c00ecf654e44ba1c38e8f1619e91da091166df9a290e1` |
| `tools/g3-manifest-probe.mjs` | `3b9c09c61ae1aed6e461e23d4984359753e926f00a56a34289ee26d62e9da385` |
| `tools/own_mutants.py` | `64e0cd5f5e581e6acd8f67aeeb1bfd2907dd639d46d9608766d3f4848b2dd046` |
| `tools/r2_check_record.py` | `6d0776247a17ead825a0c0ac45ecdd86c82beff9996fd30ca3180f83c0a97520` |
| `tools/r2_consent_probe.py` | `05824faff5a624519d5dfe6acb6bf2ba18d7a364ddba70a26ed3bf393b1c7717` |
| `tools/r2_kept_table.py` | `497680d79a2a376c0140460529aff42a6b42b885e38e52503d9f712ebb26a2d9` |
| `tools/r2_mutants.py` | `b022b36fe35578350abc0b3c53cea4d6fd081f3d1c9086adb0188f88e2be6449` |
| `tools/r2_phrase_check.py` | `5c11fc1d8f75a0b0716a5394a271822a7dbb46277375b15bdee87440c3e70e62` |
| `tools/r2_quote_check.py` | `835f96f9290d125ded41c8cb75d854a32d462e7ab10cca903fdf55805cd6fe55` |
| `tools/r2_record_mutants.py` | `abb9e9580c335f6190c6f747b81651e554f16a23e2cd4d390ab440360f11c932` |
| `tools/r2_tool_mutants.py` | `9f1cd5ac116b8a62b14284cb1558ab49b0476bad00fcb567305377cade7db407` |
| `tools/zz-rev533-consent.test.ts` | `85c8440081dce16647ac30a21583ba049c04634d6070e169d3eb5ae99afa7a20` |
| `tools/zz-rev533b-consent.test.ts` | `687f106380f0bbfb9b38fc493128e8301f8998b46531d8cb3c78b8148bdf6731` |
| `typecheck-815d.log` | `3ec872e6d363ffc2177d40cf6a5ef339c51c6f8d458776ab43e8b52ddc9b017d` |
| `typecheck-merge.log` | `3ec872e6d363ffc2177d40cf6a5ef339c51c6f8d458776ab43e8b52ddc9b017d` |
| `vitest-815d-raised.log` | `e618773fa9acb2dc70dd5f8a446d50b93fef3d6a8778a49b0a54a50df8901a41` |
| `vitest-815d-raised2.log` | `1c3c1b150bde22d1345692e28a3a4d003032279b74c807d699808f0491317c80` |
| `vitest-815d-raised3.log` | `e62832c6caf34a635c99807f8a80215fe6873c908535a06707de517395077f8c` |
| `vitest-815d-timeout-files.log` | `d9b53619382a6b9134f81aa88d30a7cf46343fe753b0638d2dd18e80e7161256` |
| `vitest-815d.log` | `4ff4574917237925fb1e2fe6d15a62a91a303e3147628dba28effc8f2123d63b` |
| `vitest-merge-raised.log` | `1a66f2e95890114cc1c549de77cc85bbdc135845a42e003de8e03e3681edd7f3` |
| `vitest-merge-timeout-files-raised.log` | `a29f6d222d2c2bd22df302f271d2c868711f7f898b32ae569044c0307ccbfe20` |
| `vitest-merge-timeout-files.log` | `17bbdcd3d30961922d227de81e4d1a0d8c2313b2a59fde7acee9ec4923b75171` |
| `vitest-merge.log` | `847b585581e9437415ddf68313dd5f6ccd7cd27ae5aa07fef7e4767831b7d343` |

72 files; the largest is 215,914 bytes.
