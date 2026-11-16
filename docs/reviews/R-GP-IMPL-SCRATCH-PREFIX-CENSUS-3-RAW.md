# R-GP-IMPL-SCRATCH-PREFIX-CENSUS-3 — CC-REV-1 implementation review of syzygy-bpyt.4.18, round 3
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 367dbb7b
Subject: r3-review.diff sha256 91b328a7b584f0dcb84181a9e2ae8a8f4a4e054d9dad42bc27dbf9b5b7a66446

Reviewer: rev-522c, fresh context, read-only. A narrow round: it judges only round 2's F3, N11, N12 and N13, and whether
the repair broke anything it touched. Abbreviations: `EV/` is `docs/evidence/scratch-prefix-census-2026-10-23/`; `SP/` is
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/`. No content of Butlers or any
other observed repository was fetched or read; no credential file, `~/.claude/`, `~/.config/` or Chrome configuration
directory was opened.

## 1. Subject identity checks

- [Observed] `sha256sum` of the frozen files: `SP/lead/b418/r3-review.diff`
  `91b328a7b584f0dcb84181a9e2ae8a8f4a4e054d9dad42bc27dbf9b5b7a66446` and `SP/lead/b418/r3-delta.diff`
  `385345c8bf8e4b3b8b7d94331b64bde543329af9eea47ead0fae105f4196839c`. Both equal the brief.
- [Observed] Re-derived by script in a fresh clone (`git clone /home/tze/GitHub/syzygy`, branch `agent/syzygy-bpyt.4.18`
  fetched, `367dbb7ba341d9af23570b949add5f8bf14faa1a` checked out): `git diff a088f1caf061c1a2062527ce8521c9b64c3c7fd1
  367dbb7ba341d9af23570b949add5f8bf14faa1a` hashes to `91b328a7…a66446` and `git diff ef7996b5 367dbb7b…` to
  `385345c8…96839c`. **Both match.**
- [Observed] `gh pr view 522`: `"headRefOid":"367dbb7ba341d9af23570b949add5f8bf14faa1a","state":"OPEN"`. Branch log:
  `367dbb7b` ← `9c04ea82` ← `ef7996b5` ← `9e1e96ab` ← `3ae43884` ← `a088f1ca`.
  `git merge-base 367dbb7b 8ff50172` = `a088f1caf061c1a2062527ce8521c9b64c3c7fd1`.
- [Observed] The delta (`git diff --numstat ef7996b5 367dbb7b`) is 5 files, +515/−24 (169+157+183+1+5 / 1+10+7+1+5):
  `assemble-selftest-2026-10-24.json`, `assemble_census.py`, `census-2026-10-24.json`, `input-checks-2026-10-24.json`,
  `verification-2026-10-24.json`. `tools/identity.py`: 5 of 5 delta paths and 41 of 41 subject paths are under `EV/`
  (`"deltaOutsidePrefix": []`, `"subjectOutsidePrefix": []`).
- [Observed] Main since the merge base (`git diff -z --name-only a088f1ca 8ff50172`): **1044 paths; 0 under `EV/`; 0 in
  common with the 41 subject paths** (`"mainUnderPrefix": []`, `"mainIntersectSubject": []`). By directory: 1034 under
  `docs/` (`docs/README.md`, 9 under `docs/reviews/`, 1019 in ten other `docs/evidence/` directories and 5 disposition
  records beside them), 3 `packages/cap1-system/src/*.system.test.ts`, `packages/polaris-dossier/src/argv.test.ts` and
  `launched.test.ts`, `packages/polaris-generation-consent/src/package-reader.test.ts`,
  `packages/polaris-generation-core/src/workspace-reach.test.ts` and `.testkit.ts`, `scripts/measure_vitest_test_durations.py`,
  `scripts/size_vitest_test_timeouts.py`. No `apps/` path, so the `cdp-browser.ts` lines F1 cites hold on main too. The full
  list is kept (`main-changed-paths.txt`, section 8).
- Every JSON was read by script (`tools/json_diff.py`, `peek.py`, `digests.py`, `long_gaps_r3.py`, `text_parity.py`),
  never whole.

## 2. Clauses relied on, and the class ruling

- `AGENTS.md` at `367dbb7b`, rule 6 (lines 126-127): "Mutate the input and confirm the check fails, per predicate, before
  trusting it (`--selftest` holds the fixtures)." Rule 9 (line 132): "A claim of absence needs a sweep with a
  denominator." Rule 10 (line 133): "Freeze the bytes a review is bound to; any later edit retires the review."
- CC-REV-1 (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:18-20`): "Changes touching any of
  seven classes require review by an independent, fresh-context reviewer, and the agent performing the change never
  finally decides which classes it touches." And (`:49-50`): "The change record states which classes the change touches,
  or "none," so a misclassification is a findable violation after the fact."
- GP-Q0 (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:60`): "Each pull request
  states which CC-REV-1 classes it touches. Any pull request whose classes are not "none" gets the CC-REV-1 independent
  review, from a fresh-context reviewer on the default model."
- Test-rigor bar, `git show 367dbb7b:.claude/skills/th-engineering/subskills/test-rigor/SKILL.md`: line 42, "**A test is
  worth keeping only if some plausible bug makes it fail.**"; bar 3, lines 60-61, "**Edge and failure paths are
  first-class** — Empty inputs, boundaries, invalid states, error branches, and concurrency-sensitive paths get tests";
  bar 4, lines 66-67, "Expected values are literals or independently derived."; workflow 2, lines 103-104, "name a one-line
  bug in the code under test this test would *not* catch but should."

**Class ruling: none**, unchanged by the delta. [Observed] The delta is 5 files under `EV/`. `git grep -F -l
scratch-prefix-census 367dbb7b` over the whole tree returns 5 files, all inside `EV/`; `git grep -F -l -e long_gap_trace -e
longGapsInTheTrace 367dbb7b` returns 2, both inside `EV/` (`assemble_census.py`, `census-2026-10-24.json`). No module,
endpoint, wire format, identity, observation seam, security surface or store touches the new function or field.

## 3. What I ran, and the results

| Run | Result [Observed] |
|---|---|
| `assemble_census.py --selftest` (TMPDIR private) | `"unmutated": true`, 43 of 43 mutants `true`, `"holds": true`; output **byte-identical** to the committed `assemble-selftest-2026-10-24.json` (`cmp`: IDENTICAL; sha256 `919a913b…be89`) |
| `assemble_census.py <clone> a864e999645a071dda40325b2235976590e02973 EV/static-sites-2026-10-24.json EV/runs /tmp/r522c-p <out>` after `npm ci` in the clone | exit 0; output **byte-identical** to the committed census (`cmp`: IDENTICAL; sha256 `8bb12c8a5adb7522ba15293b9df16fc3ea4e39cbb2928661e386c974904f3002`) |
| `input_checks.py … /tmp/r522ci <out>` | exit 0; `"control": true`, 7 of 7 refused, 3 of 3 mutants killed, `"holds": true`; one line differs from the committed file, line 48, only by the scratch path in a `FileNotFoundError` message (`/tmp/r522ci/…` against `/tmp/lc418i/…`) |
| `tools/digests.py EV/` | 41 files in `EV/`, 40 listed in `verification.fileSha256` (all but the verification record itself, `"unlistedExceptVerificationItself": []`); **64 digest checks, 0 failed** (verification's 40, the census's `toolSha256` (6), `staticSitesSha256`, `carriedObservationsSha256`, `samplerRecordSha256` (7), `runs/sampler-digests.json` (7), the self-test's and the input checks' assembler digests) |
| `tools/json_diff.py` census `ef7996b5` → `367dbb7b` | 3929 → 4053 leaf paths; **0 removed; 7 changed** (`/exposureRanking/meaning`, `/finding[4]`, `/followUps[0]/measure`, `/followUps[1]/measure`, `/followUps[1]/what`, `/subject/revision`, `/subject/toolSha256/assemble_census.py`); **124 added, all under `/exposureRanking/longGapsInTheTrace`** |
| same, self-test record | 474 → 574; 0 removed; 1 changed (`/sha256`); 100 added: 6 new mutants × 5 fields, 35 under `/expected/aggregate` and 35 under `/unmutated/got` (the `longGaps` block). **The 37 earlier mutant records: 0 changed paths** |
| same, input checks | 79 → 79; 1 changed (`/assemblerSha256`) |
| same, verification | 57 → 57; 5 changed (4 `fileSha256` entries of the regenerated files, `gatesRanAtCommit`) |
| `tools/long_gaps_r3.py` (my re-derivation, section 4 N11) | every stored long-gap figure reproduced; 7 of 7 comparisons true |
| `tools/my_mutants_r3.py` (8 mutants of mine) | 5 killed by the fixture, 3 survive (section 4 N11, N15) |
| `tools/text_parity.py` | record, follow-up JSON and PR body compared word by word (section 4 F3, N16) |
| `tools/n12_fragments.py` | round 2's 8 mutant fragments each occur exactly once in the code above `def selftest(` at `367dbb7b` |
| `python3 scripts/check_governance.py` at `367dbb7b` | exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted" (the verification record's summary) |
| `python3 scripts/check_quotations.py` at `367dbb7b` | exit 0, "OK    QC-1  a quotation beside a path:line locator was said by that file — 37 quotations examined in 18 of 943 .md files scanned (loc-paren-quote 2, loc-colon-quote 25, quote-paren-loc 10), 0 findings" |
| `bd show syzygy-bpyt.4.18` (read-only) | acceptance criterion quoted in section 7 |

"Nothing else moved" therefore holds by script: the 176 classes (`classCounts.classes` 176), `dispositionRules`,
`creatingFiles`, `leftBySIGKILL`, `neverLeftInTheseKills`, `perCreatingFile` and every `afterTheNextFreshRun` value carry 0
changed and 0 removed paths over the 3929 leaves of the round-2 record. The assembler's code outside `long_gap_trace` and the
text constants changed in two places only: `import bisect`, and `exposure_top` factored out of the `top` expression (same
expression; `/exposureRanking/top` has 0 changed paths).

## 4. Round 2's items

### F3 (blocking in round 2) — **Repaired**

The new measure, in the record (`followUps[0].measure`, built from `F1_MEASURE`, `assemble_census.py:821-829`), quoted:
"census_run.py cannot measure this change as it stands: … PR 515's dirname(link) === tmpdir() check refuses, correctly;
[Inferred, the harness was not run for this] under that harness a correct F1 still leaves the Chrome singleton directory in
place. Measure F1 (i) by unit tests over synthetic dead-owner profiles, one case and one rule-6 mutant per guard: a live
decoy carrying the exact argv element, one carrying it only as a substring, a stopped (T) process, a reused pid, a
SingletonSocket link that leaves the temp directory; and (ii) end to end only after a harness change, for a new set of runs:
a mode that leaves the killed run's orphans running and starts the fresh run in the same TMPDIR, then reads
syzygy-poc-browser- and chrome-singleton-directory stillThere 0 and the killed run's marker count 0 after the fresh run's
sweep (the marker count is a lower bound, see limits)."

- **Can a correct F1 that keeps all eight guards meet it? Yes, both parts.** [Inferred, by reading; neither part can be
  run today.]
  - (i): each named case is one that a guard refuses (substring: guard 2; stopped `T`: guard 4; reused pid: guard 3; a link
    that leaves the temp directory: guard 6), so a correct F1 passes it, and removing the guard fails it. Part (i) needs
    guard (6) **kept**: its link case passes only if F1 refuses.
  - (ii): with the orphans alive and no rename, the profile path is unchanged, so guard 2's exact element
    `--user-data-dir=<profile>` matches the orphans, and the profile's `SingletonSocket` names
    `<TMPDIR>/.com.google.Chrome.<random>/SingletonSocket`, whose directory's parent is the fresh run's `tmpdir()`. PR 515's
    check is `return dirname(directory) === tmpdir() && CHROME_SINGLETON_DIRECTORY.test(basename(directory));`
    (`apps/three-surface-poc/src/cdp-browser.ts:279`), so it accepts. PR 515 already reads the link "while Chrome runs"
    (`cdp-browser.ts:273-274`: "Chrome unlinks the profile's link as it starts to shut down, so the directory is read from
    the link while Chrome runs"), and the eight guards allow F1 to read and check it before it signals.
  - So F3's defect, a measure that only an F1 dropping guard (6) could meet, is gone. F1's `what` and its eight guards are
    unchanged (`/followUps[0]/what` and `/followUps[0]/guards`: 0 changed paths).
- **Population and pass condition, run cold.** (i) names the population (one case and one mutant per guard) and the pass
  condition (each case passes, each mutant fails). It names five cases: for guards 2, 3, 4 and 6, and "a live decoy" that
  does not say what makes it a decoy, so it is guard 1's case or a second guard-2 case (N14 c). (ii) names its population (two classes and the killed run's marker
  count) and its pass condition (0 and 0). It **cannot be run cold as filed**: the field it reads is computed only for a
  seeded run, and the marker in the same TMPDIR also matches the fresh run's own browsers (N14 a, b). (ii) is gated on "a
  harness change, for a new set of runs", so this gap does not make the repair false.
- **Same text in the record, the follow-up JSON and the PR body? No** (`tools/text_parity.py`).
  - Record against JSON: five word-level differences. The JSON adds the directory to `census_run.py`, drops "see limits"
    and adds "(assemble_census.py --selftest)". The one that matters: the JSON **drops** the record's labelled sentence
    "[Inferred, the harness was not run for this] under that harness a correct F1 still leaves the Chrome singleton
    directory in place."
  - The PR body paraphrases. Its repair line (`- **F3 (blocking), F1's measure.**`) and its F1 line (`**Measure (round 2,
    F3):**`) both **omit (ii)'s pass condition** (`"prBodyFollowUpLine": false`, `"prBodyRepairLine": false`) and the
    `[Inferred]` sentence.
  - `followups.json` equals the lane report's `Discovered-Follow-Ups-JSON` (`true`). See N16.

### N11 — **Repaired**

My re-derivation (`tools/long_gaps_r3.py`) is independent of `long_gap_trace`. It reads `runs/c0-clean.trace.jsonl.gz` and
`runs/c0-clean.samples.json` directly. A name's creation time is its smallest trace `t`; that equals its first row for
2443 of 2443 names. The clock window comes from an explicit scan, and names are assigned to gaps by a two-pointer sweep.
The published classes are read from every `upperBound` the record carries: 51 sites, 34 classes, under `leftBySIGKILL`,
`namedInTheBeadObservation/<9 keys>` and `exposureRanking.top`. `neverLeftInTheseKills` rows carry no exposure.

| Figure | Brief / record | Mine [Observed] |
|---|---|---|
| traced names; of them sampled | 2,443; — | 2443; 895 |
| inside the 12 gaps of two intervals or more; sighted | 445; 15 | 445; 15 (33.82 s) |
| inside the shorter gaps; sighted | 880 of 1,998 in 243 | 1998 in 243; 880 (123.19 s) |
| traced names in no gap | 0 | 0 |
| published classes resting on the assumption | 8 of 34 | 8 of 34: dossier-gate-acts-, dossier-origin-, dossier-records-, dossier-state-, nanoid-21, syzygy-poc-browser-, syzygy-poc-surface-fixture-p<pid>-n<ns>-, syzygy-poc-surface-fixture-template-p<pid>-n<ns>- |
| `finding[4]`'s five that do | 0 of 5 | 0 of 5 (syzygy-dossier-src-, syzygy-poc-surface-state-, syzygy-public-screen-, syzygy-trigger-, syzygy-trigger-repo-) |

- [Observed] `"agreesWithStored"`: tracedNames, long, short, dependentSet, dependentDetail (each class's three counts),
  publishedCount and windowWidth are all `true`. My per-class name counts match the record's `namesSampled` /
  `namesNeverSampled` for the 32 of the 34 classes that carry them; the other two appear only in `exposureRanking.top`,
  which carries bounds and no counts. **0 mismatches.**
- **The −0.003 s window.** [Observed] The lower bound is 1792853789.244 and the upper 1792853789.241, so no single offset
  satisfies all 895 sampled traced names. All 1,866 sighting values in `c0-clean.samples.json` sit on a 0.01 s grid (0
  off-grid), so a 3 ms crossing is within the sampler's rounding [Inferred]. Counts by offset:
  - lower end: 445/15 long, 1998/880 short (as at the middle);
  - **upper end: 446/15 long, 1997/880 short**, one name moving from a short gap into a long one;
  - middle ±0.01 s: 445/14 and 444/15; ±0.05 s: 456/15 and 439/15; ±0.25 s: 538/21 and 445/17.
  - The 8 dependent classes are the same set at all 8 offsets probed (`"dependentSameAsMid": true` each time), so
    `finding[4]`'s 0 holds at each. Without the start instant there are 242 short gaps (as `samplerGap`), the long figures
    are unchanged, and 8 classes still depend.
  - So the window moves the published 445 by one name at its upper end and moves no conclusion.
- The meaning now:
  - says what the trace shows, with assembler-computed figures;
  - says why a gap under two intervals is one period ("because the sampler sleeps a full interval between listings");
  - labels the busy-stretch reading `[Inferred]`;
  - lists the 8 classes;
  - and `finding[4]` says "0 of these 5 classes depend on the assumption".
  Every item round 2 asked for is there.
- **`long_gap_trace` as new code.**
  - [Observed] Its fixture and its 6 mutants ran in my `--selftest` run: all 6 killed, unmutated meets, record
    byte-identical.
  - **Bar 4: met.** The expected values (`assemble_census.py:490-502`) are literals. I derived them by hand from
    `LG_SAMPLER` / `LG_ROWS` (`:458-473`) before comparing:
    - instants 0, .5, 1, 3, 3.5, 4, 6, giving long gaps 1→3 and 4→6;
    - offset bounds from A (−0.1, 0.4), B (−0.9, 1.1) and C (0.0, 0.5), so the window is [0.0, 0.4] and the offset 0.2;
    - created times A .2, B 1.9, C 3.8, D 2.0, E 5.0, F 3.2, H 3.9: long gaps {B, D} and {E}, 3 names with 1 sampled;
      short gaps {A}, {F}, {C, H}, 4 names with 2 sampled;
    - p- 2 of 2 sampled names beside a long gap (A after, B before); q- none (C's after-gap does not exist); r- D and E
      never sampled, inside long gaps; s- none; the Chrome name beside 4→6.
    Every literal agrees.
  - My 8 mutants (`tools/my_mutants_r3.py`, each `old`/`new` stored in `my-mutants-r3.json`, each also run as the full
    assembler over the stored runs):
    - killed (5): `r3-trace-offset-wrong-sign` (58 record paths would change), `r3-offset-is-the-upper-bound` (5),
      `r3-start-instant-dropped` (3), `r3-gap-before-the-first-sighting-is-the-sighting-itself` (32),
      `r3-dependent-needs-both-reasons` (50);
    - **survive (3)**: `r3-long-gap-strict-threshold` (`>=` → `>`, 88 paths), `r3-published-filter-dropped` (157 paths),
      and `r3-gap-membership-closed-at-the-start` (0 paths: equivalent on the stored data).
    - The two that change the record are N15.
- Observation, no count moves: the last long gap, 150.97 → 157.01 s, runs past the command's end. The clean run's
  `seconds` is 151.7 and the sampler's is 157.0; `census_run.py:141-144` starts the sampler just before the command. The gap
  holds 0 creations [Observed]; it is counted in the 12 gaps' 33.82 s (N18).

### N12 — **Carried as directed; enough to act on cold, with a note**

- [Observed] The precondition sentence appears once in F1's and once in F2's measure in the record, and once in each
  description in the follow-up JSON (`"n12"`: 1/1/1/1). It names the population (the aggregation fixture: a seeded run,
  literal `leftAfterSIGKILL`, `afterTheNextFreshRun` and `leftByTheFreshRunItself` values, a derived name) and the pass
  condition (the four named mutants killed). The JSON adds where the fixture runs, "(assemble_census.py --selftest)".
- [Observed] Round 2's 8 mutant fragments (`SP/rev-522b/my-mutants.json`) still apply exactly once each at `367dbb7b`
  (`tools/n12_fragments.py`: 8 of 8 count 1), so the four named mutants can be rebuilt.
- What a cold reader lacks: the sentence names neither round 2's raw (`R-GP-IMPL-SCRATCH-PREFIX-CENSUS-2-RAW.md`) nor
  where the fragments live. That raw's section 5 gives the `old`/`new` of three of the four inline, and gives
  `mkdtemp-count-includes-derived` only by its effect. For F1, the precondition pins a seeded run, while F1's (ii) would use
  a same-TMPDIR run (N14 a). See N16.

### N13 — **Repaired**

- [Observed] (`tools/text_parity.py`): the record's `what` and the follow-up JSON both carry "dead-owner root holding an
  entry of an R9 class and one of an R6 class", the assembler-rule clause ("needs a disposition rule for the root's own
  class") and "a fresh run started in the killed run's leftovers". The old "same private TMPDIR" appears in neither.
- **Testable as filed through either branch?**
  - Branch 2 (synthetic dead-owner roots seeded, as PR 509's tests do): yes, as filed.
  - Branch 1: yes, once its two named preconditions exist (`census_run.py` lists each root's children; the assembler gets
    a rule for the root's class). The tracer already logs an entry "directly in os.tmpdir() as read at call time"
    (`scratch_trace.cjs:9`; the predicate `path.dirname(resolved) === path.resolve(os.tmpdir())` at `:40`). So a root's
    children, made after the setup file reassigns TMPDIR, would carry trace rows, which the assembler classes by basename
    [Inferred from the predicate; not run].
  - The "fresh run started in the killed run's leftovers" is what `--seed-tmp-from` does (`census_run.py:18`, "starts the
    run in the leftovers of an earlier run").
- One sentence the delta rewrote now conflicts with branch 1: N17.

## 5. New findings

All five are notes. None makes a repaired item false.

### N14 — note — F1's part (ii) cannot be run cold as filed, and part (i)'s cases are partly unnamed

- **Evidence.**
  - (a) [Observed] `stillThere` exists only for a seeded fresh run. `afterTheNextFreshRun` is built `for fl in
    fresh_labels` (`assemble_census.py:334-336`) with `fresh_labels = [l for l in labels if seeded_from(l)]` (`:693`), and
    `seeded_from_of` keys every run by its private directory (`by_private = {r['privateDirectory']: label …}`, `:158`). A
    fresh run that shares the killed run's private directory is no fresh label, and one of the two runs drops out of
    `by_private`. So (ii)'s same-TMPDIR mode needs an `assemble_census.py` change as well as a `census_run.py` one, and the
    measure names neither the change nor the field it would add. The N12 precondition pins the seeded path, which (ii) will
    not use.
  - (b) [Observed] The harness marker is "the exact `--user-data-dir=<private-directory>/tmp/` marker" (`census_run.py:14`;
    the record's `'marker': '--user-data-dir=<private-directory>/tmp/ in the arguments'`, `:175`). [Inferred] In the same
    TMPDIR it also matches every browser the fresh run starts, so "the killed run's marker count" depends on when it is
    read and on how the killed run's processes are told apart. The kill record already stores their pids
    (`processesCarryingTheMarker.pids`, `:177`).
  - (c) [Observed] Part (i) asks for "one case and one rule-6 mutant per guard" and names five cases, for guards 2, 3, 4
    and 6 and one ambiguous decoy. Guards (5) (re-scan before delete) and (7) (path normalization) have none. Guard (1)
    (owner alive, other namespace) has one only if the decoy is its case. Guard (8) is the mutant-and-review requirement
    itself, so a "case" for it is undefined. "A live decoy carrying the exact argv element" does not say what makes it a
    decoy: a live owner (guard 1) or another uid (guard 2). No positive case is named (a
    dead-owner profile whose orphans are stopped and whose in-TMPDIR singleton directory is removed). [Inferred] The
    per-guard mutants still force F1 to act, because a sweep that never acts leaves every guard mutant alive.
- **Failure scenario.** The implementer builds the same-TMPDIR mode, and the assembler cannot produce `stillThere` for
  the fresh run. Or the fresh run's own Chrome inflates the marker count, so a correct F1 fails (ii). Either way (ii) is
  waived, and the bead's end-to-end evidence never exists. That is the waiver path F3 named, now behind a passing part (i).
- **Proposed fix.** When F1 is filed, add to (ii): "this needs an assemble_census.py change too: compute stillThere for a
  same-TMPDIR fresh run from the killed run's listingAtEnd names; and the killed run's marker count is the number of the
  kill record's processesCarryingTheMarker.pids still alive (start time checked against pid reuse) after the fresh run
  exits". Name cases for guards 1, 5 and 7. Say that guard 8 is met by the mutants and the review. Say which decoy is meant.
  Add one positive case. The record need not be regenerated for this; the bead text is where it binds.

### N15 — note — `long_gap_trace`'s fixture leaves its gap boundary and its published filter unpinned, and both move the published sentence

- **Evidence.**
  - [Observed] `LG_SAMPLER` has gaps of 0.5 s and 2.0 s only, with an interval of 0.5 s, so no gap is exactly two intervals.
    The stored run has two such gaps: 2.01 → 3.01 and 127.75 → 128.75, both 1.00 s (`perGap`). Mutant
    `r3-long-gap-strict-threshold` (`round(later - earlier, 2) >= 2 * interval` → `> 2 * interval`, `assemble_census.py:275`)
    survives the fixture and changes 88 record paths. The meaning's last sentence becomes "7 of the 34 classes … :
    dossier-origin-, …", which drops `dossier-gate-acts-`, whose only dependent name sits in a 1.00 s gap.
  - [Observed] All five `LG_PUBLISHED` classes cover every fixture name. Mutant `r3-published-filter-dropped` (removes
    `if cls not in published: continue`, `:302-303`) survives and changes 157 paths; the meaning then reads "60 of the 34
    classes whose upper bound this record publishes …".
  - Bar 3 (SKILL.md:60-61: "boundaries … get tests") and the core rule (line 42). Today only the byte-identical re-run
    catches either mutant. `exposure_gap`'s own boundary is pinned (`gap-of-two-intervals-counts-as-one-gap`, killed),
    so the omission is specific to the new function.
- **Failure scenario.** A later edit flips the comparison or drops the filter, for example when N1's sampler change reuses
  this function for a new set of runs. `--selftest` still reports `"holds": true`, and the record publishes 7, or 60 of 34.
- **Proposed fix.** Add to `LG_SAMPLER` a gap of exactly two intervals with one never-sampled traced name created inside
  it. Add a class outside `LG_PUBLISHED` with a never-sampled name in a long gap. Write the hand-derived literals, and add
  the two mutants above (their `old`/`new` are in `my-mutants-r3.json`). Do it in the same PR that next touches
  `assemble_census.py`, or before N12's precondition work, which edits the same fixture.

### N16 — note — the three carriers of F1's measure are not the same text, and N12's sentence names no raw

- **Evidence.** [Observed] (`tools/text_parity.py`, section 4 F3):
  - the follow-up JSON drops the record's `[Inferred, the harness was not run for this]` sentence;
  - the PR body drops (ii)'s pass condition in both places it states the measure;
  - neither the record nor the JSON names `R-GP-IMPL-SCRATCH-PREFIX-CENSUS-2-RAW.md` for N12 (`"namesTheRound2RawFile"`:
    false, false);
  - F1's `what` does name round 1's raw by file.
- **Failure scenario.** The bead is filed from the JSON, and the reason (ii) exists, that a correct F1 cannot pass the old
  harness, is no longer labelled as an inference. A PR-body reader sees a part (ii) with no pass condition. A cold
  implementer of N12 has mutant names and no fragments.
- **Proposed fix.** At filing, copy `followUps[0].measure` verbatim into the F1 bead, keeping the label. In N12's sentence,
  name `R-GP-IMPL-SCRATCH-PREFIX-CENSUS-2-RAW.md` section 5 N12, and inline the fourth fragment
  (`sum(1 for r in table if r['family'] == 'mkdtemp')` → `sum(1 for r in table if r['family'] in ('mkdtemp',
  'derived'))`). In the PR body, point to `followUps[0].measure` rather than paraphrase it.

### N17 — note — F2's rewritten measure reads `leftBySIGKILL`, which under branch 1 must list a class outside R2/R4/R5/R7

- **Evidence.** [Observed] `F2_MEASURE` (`assemble_census.py:839`): "assemble_census.py leftBySIGKILL lists only R2, R4,
  R5, R7 classes (and R3 until F1) after a fresh run started in the killed run's leftovers, and the kill itself left at
  least one dead-owner root …". `leftBySIGKILL` is the table of classes a kill left. Under branch 1 the kill must leave a
  dead-owner root, whose class (the new rule N13 asks for) is in that table and is none of R2, R4, R5, R7. Read literally,
  a correct, non-vacuous F2 fails its own measure. The intended reading is `afterTheNextFreshRun/<fresh>/stillThere`.
  "leftBySIGKILL lists only" predates the delta, but the delta rewrote this sentence and added branch 1.
- **Failure scenario.** The F2 implementer or its reviewer reads the measure literally and either fails a correct F2 or
  adds the root's class to the allowed list, which would let a root that the fresh run did not sweep pass.
- **Proposed fix.** When lodged: "the rows of leftBySIGKILL whose afterTheNextFreshRun stillThere is above 0 are only R2,
  R4, R5, R7 classes (and R3 until F1); the root's own class has stillThere 0".

### N18 — note (minor) — wording of the clock window and of the long gaps' span

- **Evidence.** [Observed] The meaning says "a negative window means those bounds overlap by that much". The bounds in
  fact cross: the largest lower bound exceeds the smallest upper bound by 0.003 s, and no offset satisfies all 895 names.
  At the window's upper end the long-gap count is 446, not 445 (section 4, N11). The 12 gaps' 33.82 s include the
  150.97 → 157.01 s gap, which runs past the command's 151.7 s.
- **Failure scenario.** A reader takes "overlap" as agreement between the clocks, or the 445 as exact; no conclusion
  changes.
- **Proposed fix.** At the next regeneration: "a negative window means the bounds cross by that much, within the
  sampler's 0.01 s rounding; at the window's ends the count is 445 or 446"; and say that the last gap extends past the
  command's exit.

## 6. Every changed output, or the evidence that there is none

None. [Observed] The delta's 5 files are all under `EV/`. The directory is cited only from inside itself (`git grep -F -l
scratch-prefix-census 367dbb7b`: 5 of 5 citers in `EV/`), and the new function and field only from inside it (2 of 2).
No module, rendered page, route, machine body, wire format, refusal string, exit code, signed or digest-bound artifact,
spec, consent or retention decision changes. Inside `EV/` the changed outputs are exactly the 8 census paths, 1 + 100
self-test paths, 1 input-check path and 5 verification paths listed in section 3. Every digest matches its file (64 of 64),
and the census and self-test re-run byte-identically.

## 7. Verdict per acceptance criterion

`syzygy-bpyt.4.18` (`bd show`, read-only): "A committed census record names the commit in full, the per-prefix counts
after one SIGKILLed run in a private TMPDIR, and the creating file for each prefix. Each prefix has a recorded disposition:
a sweep, a test-kit temp root, or a stated residual."

| Criterion | Verdict | Basis |
|---|---|---|
| Names the commit in full | **Met** | unchanged; the assembler asserts `treeCommit` for every run and the static census, and the re-run passed them |
| Per-prefix counts after a SIGKILLed run in a private TMPDIR | **Met** | 0 changed paths under `leftBySIGKILL` and `afterTheNextFreshRun` against round 2; byte-identical re-run. Still not pinned by the self-test (N12, carried) |
| Creating file for each prefix | **Met** | 0 changed `creatingFiles` paths |
| A disposition for each prefix | **Met, conditionally** (as round 2) | 176 of 176, rules unchanged; R6/R9 hold once F2 is lodged |
| Round 2's F3 | **Met** | section 4: a correct F1 with all eight guards can meet both parts |
| Round 2's N11 | **Met** | every figure re-derived independently; the window moves one count by one name and no conclusion |
| Round 2's N13 | **Met** | testable through either branch as filed (branch 1 behind its two named preconditions) |
| Round 2's N12 (carry, not repair) | **Met** | one sentence in each follow-up; actionable, with N16's naming gap |
| The delta broke nothing it touched | **Met** | section 3 sweeps; 37 earlier mutant records unchanged; 43 of 43 killed |
| Follow-up texts safe and testable to file | **Met with exceptions** | N14 (F1 (ii) needs an assembler change and a marker attribution), N16 (carry the record's text verbatim), N17 (F2 measure wording) |
| `long_gap_trace` to the assembler's bar | **Met with exceptions** | fixture literals independently derived, 6 of 6 mutants killed; two predicates unpinned (N15) |

Class: none. Verdict: CONFIRM WITH EXCEPTIONS. Under the owner's notes-only stopping rule this round clears `367dbb7b`;
N14-N18 go to the dispositions record and follow-up beads.

## 8. Cleanup

- Deleted:
  - the scratch clone `SP/rev-522c/clone` (with its `node_modules`);
  - my two re-derived diffs (`my-review.diff`, 1.1 MB, over the 300 KB limit, and `my-delta.diff`; their digests are in
    section 1 and equal the frozen files);
  - my private directories `/tmp/r522c-1` (npm's compile cache) and `/tmp/r522c-2` (empty).
  - The tools removed `/tmp/r522c-p`, `/tmp/r522ci`, `/tmp/r522c-m` and `/tmp/r522c-s` themselves.
  - `ls -d /tmp/r522c*`: "No such file or directory". Nothing else in `/tmp` was touched; no process outlived its command;
    nothing was killed.
- No file under `/home/tze/GitHub/syzygy/.worktrees/` was edited. The main checkout was used only for `git clone`,
  `bd show` and one read-only `git grep` at `367dbb7b`.
- Kept (sha256 by `sha256sum`; this raw's own digest is in the reply), each a full path:

  | File | sha256 |
  |---|---|
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/tools/digests.py` | `1f13d66767d463d0ba1c1ff1e3dbe96965c76a2ee93fa967ba94fc101c62b551` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/tools/identity.py` | `bfca61615c57aa3b16f84799f58f4bc7c5217052d75fb8567aa941c383f8a0dc` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/tools/json_diff.py` | `ee5ce3153d142f2fa0080627b082728a96076bf0d3ab73330058b6ee5b6809d2` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/tools/long_gaps_r3.py` | `dc1b8d02a56180d8a7b38576e5bb9a96d75dc696e2eb1c3791c48c5c8bfcb787` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/tools/my_mutants_r3.py` | `006edfb75fb160a9fc6e2bb85af23a6a84162035787ab051e81a7b5c54db4563` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/tools/n12_fragments.py` | `7abf74c739a1be90d8c290c95f531c7a239dc3f91ed10964581807cac7cbb93f` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/tools/peek.py` | `2306442ec9296b75ed3681e00719cc6d53986de8df4344de1b2b0028b5e3c634` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/tools/survivor_text.py` | `4571b0311f79607a43613e47476a6abe72ee0528f79ab9dc5f407ec66a17d38c` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/tools/text_parity.py` | `021b6dab69cc3112f1287b9c42ceb3457a7906eb3f55ef76c2d06f3c3d6c71a9` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/assemble-selftest-rerun.json` | `919a913b862fe96e255962cd6e80cf258e98d4d9208f1497cb09016858f4be89` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/census-rerun.json` | `8bb12c8a5adb7522ba15293b9df16fc3ea4e39cbb2928661e386c974904f3002` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/input-checks-rerun.json` | `73669cd796126333bbe6ebc11f7c9df25b02f9e2269f59dd7c7e2087d878c3dc` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/long-gaps-r3.json` | `0ce90a8afdc6992413860cd6069348203a6b9c1b738dffcb23dd482291988ab4` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/my-mutants-r3.json` | `95deb8d3aa09801e99356d772a997b72f2032c0f206625bbd80697a6aaa63b2a` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/survivor-text.json` | `3de8d1bff32d53545ece2685153d34688f2ef4465f3ecaebdd5c7f9e278711a0` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/text-parity.json` | `9b38b57ef7dcd973dbd8dda7d846daa674d43a26e77fd63d0e42ea2afba1813b` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/assemble-rerun.out` | `670f58b2dd3f104c432eaf7908295e972f5cd028b362db3477f038169bd1186c` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/input-checks-rerun.out` | `9e11dccc9aeac0c9ffe127941c2d70be4b0ae4ee402f3460e002eea145eb3cd0` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/gate-governance.log` | `ae8a0f80eaa556b267a0539ccd01be2bcb097d6408497a1496d285132efc4450` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/gate-quotations.log` | `e15ea08dc603f427665fa899aef5adcaca1bea8119176a394da15869bb83dde2` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/npm-ci.log` | `a2afac1ca87e7ed53812d585f7d38065899a3668e53bc980e852c115ffb3930f` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/pr-body.md` | `956d64d920fe7bcfda772474e1fd3ec79e87b9e7daf1c64c9cf34e6c69926ed5` |
  | `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-522c/main-changed-paths.txt` | `1ea3d9c10038ae12433608069f7a0a57c2f119bc4a54ababf10fb6bdccf0dd61` |

- About the kept files:
  - `census-rerun.json` and `assemble-selftest-rerun.json` are byte-identical to the committed files of the same role.
  - `assemble-rerun.out`, `input-checks-rerun.out` and `gate-quotations.log` have the same digests as round 2's kept files
    of the same names.
  - `my-mutants-r3.json` stores each mutant's `old`/`new`; the fragments apply to `EV/assemble_census.py` at `367dbb7b`
    (sha256 `ffbc0f974967a1899e4d1b4f18b580b04e088e1cf01d6489f42a9432c2d501f8`), and `tools/my_mutants_r3.py` regenerates
    the mutant copies.
  - `pr-body.md` is the PR body as `gh pr view 522 --json body` returned it during this review.
  - I did not reuse round 2's `tools/long_gap_census.py`. I read only round 2's `my-mutants.json`, for N12.
