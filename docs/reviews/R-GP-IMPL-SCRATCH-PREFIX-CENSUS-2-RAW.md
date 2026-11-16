# R-GP-IMPL-SCRATCH-PREFIX-CENSUS-2 — CC-REV-1 implementation review of syzygy-bpyt.4.18, round 2
Verdict: REVISE
Reviewed commit: ef7996b5
Subject: r2-review.diff sha256 2a2dda70f287df8f6dd0c8472f43f6df4fba610333716a08544350d928c86b34

Reviewer: rev-522b, fresh context, read-only on the PR (no push, no PR comment, no merge, no bd mutation). No target
repository content was fetched; nothing under `~/.claude/` (other than the test-rigor skill file the brief names),
`~/.config/` or any token store was opened, and no Chrome was launched. Paths are relative to the reviewed commit unless
absolute. `EV/` = `docs/evidence/scratch-prefix-census-2026-10-23/`. `SP/` = the session scratchpad
`/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/`.

## 1. Subject identity checks

- [Observed] `sha256sum` of the two frozen files:
  `2a2dda70f287df8f6dd0c8472f43f6df4fba610333716a08544350d928c86b34  r2-review.diff` and
  `c3e8ced8cd93389326076f852880c1d17c6467d1d2fcba70e3d71d0e9f281abd  r2-delta.diff`. Both equal the brief.
- [Observed] Re-derived in my scratch clone at `ef7996b5c879b9dcf86111f0927f2b16ac1589e6` (`git rev-parse HEAD`):
  `git diff a088f1caf061c1a2062527ce8521c9b64c3c7fd1 ef7996b5c879b9dcf86111f0927f2b16ac1589e6 --output=...` hashes to
  `2a2dda70f287df8f6dd0c8472f43f6df4fba610333716a08544350d928c86b34`, and
  `git diff e2aae62e ef7996b5 -- EV/` to `c3e8ced8cd93389326076f852880c1d17c6467d1d2fcba70e3d71d0e9f281abd`.
  **Both digests match.**
- [Observed] `git diff --shortstat a088f1ca ef7996b5`: ` 41 files changed, 51491 insertions(+)`; name-status `41 A`, and
  0 rows outside `EV/`. Delta: ` 13 files changed, 2033 insertions(+), 778 deletions(-)` (10 `M`, 3 `A`: `runs/carried-observations.json`,
  `runs/sampler-digests.json`, `static-selftest-2026-10-25.json`). `git merge-base a088f1ca ef7996b5` = `a088f1ca...`.
- [Observed] `git ls-remote https://github.com/Tzeusy/syzygy.git`: `refs/heads/main` `a088f1caf061c1a2062527ce8521c9b64c3c7fd1`,
  `refs/heads/agent/syzygy-bpyt.4.18` `ef7996b5c879b9dcf86111f0927f2b16ac1589e6`. `gh pr view 522`: `"h":"ef7996b5c879b9dcf86111f0927f2b16ac1589e6","n":41,"s":"OPEN"`.
  `gh pr checks 522`: `checks	pass	1m24s` and `node	pass	3m33s`.
- [Observed] Round-1 raw `SP/rev-522/R-GP-IMPL-SCRATCH-PREFIX-CENSUS-1-RAW.md` hashes to
  `851f18003dd67916843ab7fc5217140922c8eeeca292314d989eee9bdc8d77d3`, as the brief says.
- [Observed] The run commit `a864e999645a071dda40325b2235976590e02973` is an ancestor of `ef7996b5`; `census_run.py`,
  `scratch_trace.cjs` and `tmp_sampler.py` are byte-identical at the run commit and at `ef7996b5` (`True` for each).
  `git diff --name-status 9e1e96ab ef7996b5` is one row, `M EV/verification-2026-10-24.json`, so the gates the record
  states (at `9e1e96ab`) ran on the same census bytes.

## 2. Clauses relied on, and the class ruling

CC-REV-1 (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:18-20`): "Changes touching any of
seven classes require review by an independent, fresh-context reviewer, and the agent performing the change never
finally decides which classes it touches." Classes at lines 31-43 ("authority boundaries", "graph identity",
"deterministic observation", "security", "data migration", "public interface", "certificate logic"). Lines 49-50
(bold markers dropped): "The change record states which classes the change touches, or "none," so a misclassification
is a findable violation after the fact." Line 51: "A reviewer or the owner may reclassify at any time."

GP-Q0 (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:52-55`): "\"Behavior-preserving\"
means none of the following changes:" / "a rendered byte, a wire format, a refusal string or an exit code;" / "a signed
or digest-bound artifact;" / "a consent, security or retention decision."

AGENTS.md at the reviewed commit, verification rules 2 ("No "zero / all / 100%" claim without running that exact sweep
this session, confirmed by a second method."), 3 ("Digests are scripted, never transcribed; totals are computed."),
6 ("Mutate the input and confirm the check fails, per predicate, before trusting it"), 9 ("A claim of absence needs a
sweep with a denominator."), 10 ("Freeze the bytes a review is bound to; any later edit retires the review.") and 11
("An evidence record names its subject and the subject's digest").

Test-rigor bar (`th-engineering/subskills/test-rigor/SKILL.md`), Core Rule: "A test is worth keeping only if some
plausible bug makes it fail." Bar item 3: "Edge and failure paths are first-class"; item 4: "Expected values are
literals or independently derived."

**Class ruling: none (round 1's ruling confirmed).** [Observed] All 41 files are new and under `EV/`;
`git grep -l -F 'scratch-prefix-census' ef7996b5` returns 5 files, all inside `EV/`, 0 outside, so no workflow, npm
script, manifest or governed file reaches the tools. No module, endpoint, write boundary, identity, observation seam,
auth or egress surface, migration or certificate changes. **GP-Q0:** [Observed] no rendered byte, wire format, refusal
string, exit code, signed or digest-bound artifact, or consent/security/retention decision changes; both gates I ran
give the results the verification record states. F1's eventual change (signals and deletes) must state its own classes.

## 3. What I ran and the results

Scratch clone `SP/rev-522b/clone` at `ef7996b5`, `npm ci` (`added 115 packages in 1s`). Every run that makes temp
entries used a private TMPDIR or scratch path (`/tmp/r522b-1`, `/tmp/r522bi`, `/tmp/r522b-p1`, `/tmp/r522b-m`,
`/tmp/r522b-s`), all removed (section 8).

| Check | Result (verbatim where quoted) |
|---|---|
| Assembler self-test (`assemble_census.py --selftest`) | `"unmutated": true`, 37 mutant keys all `true`, `"holds": true`; exit 0. My record is **byte-identical** to the committed `EV/assemble-selftest-2026-10-24.json` (both `467b41d0779e70bebe27bf118caf83f7686cbc2406e90be252965323a933da3d`). Killed 37 of 37; 4 by a stop: `['unknown-creator-rule-dropped', 'no-frame-not-treated-as-unknown', 'partition-leaves-a-rule-out', 'partition-counts-the-wrong-rule']` |
| Static self-test (`static_sites.py --selftest`) | `{"unmutated": true, "killed": {"literal-rule-without-hyphen-inside-the-literal": true, "literal-rule-without-underscore-ending": true, "literal-rule-without-template-form": true, "literal-rule-without-leading-dot": true, "disposable-pattern-dropped": true, "tmp-path-pattern-dropped": true, "a-line-matching-no-pattern-reports-a-site": true}, "holds": true}`; byte-identical to `EV/static-selftest-2026-10-25.json` (`5317528c...3303` both) |
| Input checks (`input_checks.py`, scratch `/tmp/r522bi`, run commit) | `{"control": true, "refused": {"trace-byte-changed": true, "trace-line-removed": true, "run-record-names-another-commit": true, "static-census-names-another-commit": true, "sampler-record-missing": true, "sampler-record-byte-changed": true, "sampler-digest-entry-removed": true}, "mutantsKilled": {"sampler-digest-not-compared": true, "sampler-digest-entry-not-required": true, "probe-directory-left-behind": true}, "holds": true}`. Equal to the committed record except one path: `/cases/sampler-record-missing/lastLine` names my scratch directory instead of `/tmp/lc418i`; `assemblerSha256` equal (`32f2e9449b540ef5d387b10097afa4fd296461aab8fc61cf0879a743a1144fec`) |
| Altered clean-run sampler (my own: one digit of `c0-clean.samples.json`, the record the bounds rest on, in a copy) | `AssertionError: ('c0-clean', 'the sampler record is not the one the digest file names')`, exit 1, no record written |
| Full assembler re-run over the stored runs | exit 0; `cmp` against `EV/census-2026-10-24.json`: **BYTE-IDENTICAL** (`b1e0099f80cbc950e7eff1a6f9c64d30c6bb128ca1efce76e849d50138d36a22`); the probe directory `/tmp/r522b-p1` was gone afterwards (N10) |
| Static census re-run (`static_sites.py` at `a864e999`) | **BYTE-IDENTICAL** to `EV/static-sites-2026-10-24.json` (`f5ad2571...2a69`); `"blobsRead": 818`, `"filesWithASite": 260`, `"sites": 591`, `"js-mkdtemp-disposable": 0`; `withLiteral 179 of 591` |
| Unchanged-fields comparison (`tools/census_diff.py`, `e2aae62e` census against `ef7996b5` census) | see section 4, "Unchanged where it must be" |
| Carried values (`tools/carried_checks.py`) | see section 4, N9 and F1 |
| Bound re-derivation (`tools/bound_rederive.py`, `tools/bound_all_classes.py`, `tools/long_gap_census.py`, `tools/published_dependence.py`, own code; reads only `runs/c0-clean.*` and the census) | see section 4, F1, and N11 |
| Guards verbatim (`tools/guards_verbatim.py`) | `raw guards 8 record guards 8`, `1 equal` … `8 equal`; `each raw guard inside the report F1 description: [True, True, True, True, True, True, True, True]` |
| My mutants of the aggregation code (`tools/my_mutants.py`) | 4 of 8 killed by the fixture; 4 survive (N12) |
| `python3 scripts/check_governance.py` (clone, absolute path) | exit 0, `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted` (equal to the verification record's line) |
| `python3 scripts/check_quotations.py` (clone) | exit 0, `OK    QC-1  a quotation beside a path:line locator was said by that file — 37 quotations examined in 18 of 943 .md files scanned (loc-paren-quote 2, loc-colon-quote 25, quote-paren-loc 10), 0 findings` (equal to the verification record's line) |

Not run by me: the PROJECT-STATUS battery (`commands=110 nonzero=0` is the lane's figure, valid for `ef7996b5` only),
the tracer self-test (the tracer is byte-identical to round 1's; round 1 re-ran it), a full `npx vitest run`, and any
new census run. Disclosure: my first `input_checks.py` invocation passed the reviewed commit instead of the run commit;
the assembler refused every case for the commit mismatch, as it should, the tool removed its scratch directory, and its
output files were overwritten by the correct run quoted above.

## 4. Round 1's findings, each with a verdict

| Item | Verdict | Evidence |
|---|---|---|
| F1 (required) | **Repaired** | below |
| F2 (required) | **Repaired** | below |
| Section 7 (required) | **Repaired as asked** | below; the asked-for fixture does not reach the leftover and fresh-run counts (N12, new) |
| N1 | Repaired (limits text) | `limits[0]` names `mkdtempDisposableSync` and the recursive-mkdir parent with the example `mkdirSync(join(tmpdir(), "a", "b"), { recursive: true })`; `static['sitesByKind']['js-mkdtemp-disposable']` is 0 |
| N2 | Repaired | `finding[0]` now reads "at least 10 / 26 / 8 processes carrying the --user-data-dir marker in their arguments (Chrome's) survive … The process count is a lower bound"; `limits[6]` names `cat` and `chrome_crashpad_handler` |
| N3 | Repaired | Marker: R3 and `followUps[0].what` say `--user-data-dir=<profile>`, "no trailing slash"; no `<profile>/` remains in F1's what, guards or R3 (sweep: `[]`); `cdp-browser.ts:462` at the run commit holds `` `--user-data-dir=${profile}`, `` (checked). Guards: 8 of 8 equal to round 1's N3 text after whitespace normalisation, and all 8 are in the lane's F1 description. **But F1's `measure` is not a test of F1 (F3, new)** |
| N4 | Repaired | R6 and R9 `why` texts say "Conditional on follow-up F2 being lodged on syzygy-bpyt.4.4"; F2's `what` has the non-vacuity condition, "of R3 until follow-up F1 lands", and `no-egress.test.ts, line 55` with "pass TMPDIR through, or name them as a residual". The first non-vacuity branch is not readable as worded once F2 works (N13, new) |
| N5 | Repaired | `LITERAL` is round 1's proposed regex character for character; 179 of 591 sites read a literal (round 1 predicted 177 + 2); all 10 files round 1 listed now show their literal under `staticCoverage.neverSeen` (e.g. `restart.ts` `['syzygy-poc-restart-']`, `session-view.ts` `['polaris-view-probe-']`, `daemon-entry-unchanged.system.test.ts` `['syz-entry-']`) |
| N6 | Repaired | `subject.notRun` and `limits[3]` say root-run tests start `python3 -c` children and "never seen" for the 93 `scripts/` files "is structural and measures no reach" |
| N7 | Repaired | R4: "one per project as each project starts"; `vitestProjectDirectoriesInTheCleanRun` `{"count": 7, "firstSightingSeconds": [1.51, 1.51, 36.93, 75.99, 126.24, 131.29, 138.85], "runLastedSeconds": 151.7}`; R2 no longer says "only" |
| N8 | Repaired | `WORD_STEM` excludes `<word>-<6>` names; fixture `polaris-marker-KE28cb` → `unattributed`/R8; mutants `vitest-shape-takes-a-word-stem-name` and `word-stem-suffix-one-shorter` killed |
| N9 | Repaired | `digests == r1 blobs: True  digests == r2 blobs: True` (7 of 7 sampler records); `runs/` 22 files at `e2aae62e`, 24 at `ef7996b5`, `changed []`; census `samplerRecordSha256 == digests True`; an altered `c0-clean` sampler stops the assembler (section 3) |
| N10 | Repaired | `finally` removes the probe; my full re-run left no `/tmp/r522b-p1`; input-checks control now requires it gone and the `probe-directory-left-behind` mutant is killed |

### F1, the honest bound

- **The repair as asked.** [Observed] `exposure_slots` (`assemble_census.py:222-237`) adds `2 * gap` per sampled name
  and `gap` per never-sampled name; `exposureRanking.meaning` is reworded; `finding[4]` and the PR body say "0.213 or
  less" with the Markov statement; `topLevelChildrenOfOneObserved` is carried with a dated note (`limits[7]`).
- **The carried value.** [Observed] `carried-observations.json` names record `EV/census-2026-10-24.json` at
  `e2aae62efc5a4c7d346f03a2c581c852b5ea8802`, path `leftBySIGKILL[26].topLevelChildrenOfOneObserved (class nanoid-21)`,
  `blobSha256 39e107b0...8bdb`: `carriedFrom blobSha256 ok True`, row 26 is `nanoid-21` with `['ssr']`, the only row of
  the round-1 record carrying the field, and the regenerated row equals it.
- **Is 0.61 s honest or chosen after the fact?** [Observed] `tmp_sampler.py:52` sleeps `time.sleep(interval)` (0.5 s)
  after each listing, so every sampler period is at least 0.5 s and two periods take at least 1.0 s. A gap under two
  intervals between consecutive sighting instants is therefore exactly one period. The 242 such gaps are measured
  single periods; their maximum is 0.61 s. The threshold follows from the instrument, not from the data; it is not
  after the fact. [Inferred] The record does not say why under-two-interval gaps are single periods (N11).
- **Re-derivation, own code.** [Observed] `tools/bound_rederive.py` over `runs/c0-clean.*`: `"sightingInstants": 255`,
  `"gaps": 254`, `"gapsUnder1s": 242`, `"maxGapUnder1s": 0.61`, `"gapsOf1sOrMore": [1.0, 1.0, 1.01, 1.01, 1.01, 1.02,
  1.52, 2.03, 2.54, 3.52, 6.04, 12.12]`, `"maxGap": 12.12`. All 30 published mkdtemp-class `upperBound` values equal
  my recomputation at 0.61 s (`"compared": 30, "equal": 30`).

  | Class | names / sampled / never | published (0.61 s) | every gap 0.5 s | every gap 12.12 s (stored max) | no gap assumption (D) | trace-aligned (E, 0.05 s) |
  |---|---|---|---|---|---|---|
  | `syzygy-public-screen-` | 12 / 12 / 0 | 0.213 | 0.196 | 2.034 | 0.196 | 0.196 |
  | `syzygy-trigger-` | 35 / 4 / 31 | 0.157 | 0.129 | 3.116 | 2.503 | 0.095 |
  | `syzygy-dossier-src-` | 33 / 3 / 30 | 0.145 | 0.119 | 2.876 | 2.417 | 0.088 |
  | `syzygy-trigger-repo-` | 1 / 1 / 0 | 0.018 | 0.017 | 0.170 | 0.017 | 0.017 |
  | `syzygy-poc-surface-state-` | 4 / 0 / 4 | 0.016 | 0.013 | 0.320 | 0.320 | 0.009 |

  D: a sampled name lived at most from the latest known sample instant before its first sighting to the earliest after
  its last (no assumption: every sighting instant is a sample time); a never-sampled name at most the longest gap.
  E: the trace's epoch times are aligned to the sampler clock by the 895 sampled names (offset window `-0.003` s, i.e.
  pinned to the sampler's 0.01 s rounding), and a never-sampled name created at its aligned trace time was gone by the
  next sighting instant; E assumes the trace time is within an allowance of the creation (the tracer logs after the
  call returns). "Every gap 12.12 s" exceeds 1 for three of the five and is vacuous as a probability bound.
- **Does the bound that sets the 12 long gaps aside remain an upper bound?** For the five prefixes of `finding[4]`:
  **yes, without the gap assumption.** [Observed] None of their 85 names was created inside a gap of 1.0 s or more, and
  none of their 20 sampled names has a sighting edge on one (`neverSampledCreatedInALongGap 0`, `sampledWithAnEdgeOnALongGap 0`
  for each of the five); at every trace-latency allowance I tried (0.05, 0.25, 0.5 and 1.0 s) each of the five stays
  at or under its published bound. [Inferred] So `finding[4]`'s "0.213 or less" holds whether those gaps were quiet or
  a stalled sampler. For the record's other published bounds the assumption is load-bearing, and its disclosure ("cannot
  be told from a quiet stretch") is not precise: the trace shows the long gaps are not quiet (N11).
- **What the record may honestly publish.** "0.213 or less" for the five, as now, may stand; it may add that the figure
  does not rest on the gap assumption (trace-aligned 0.196 or less). Round 1's 0.196 at 0.5 s happens to equal the
  assumption-free figure for `syzygy-public-screen-` (its 24 sighting edges are all on gaps of 0.51 s or less), so the
  lane's 0.213 is the more conservative of two honest figures, not a correction of a wrong one. The per-class
  `upperBound` values elsewhere may be published only as "if every sampler period was at most 0.61 s", with the classes
  whose names sit in a long gap named (N11).

### F2, the partition

- [Observed] `finding[2]`: "… (170 by mkdtemp): 2 by test-model-fixture.ts (PR 509 sweeps them); 1 by Chrome itself (its
  singleton directory); 1 by cdp-browser.ts (the browser profile); 1 by vitest itself (its project directory); 1 by npm
  itself (its compile cache); 6 by other non-test modules; 1 as a lock file (attributed to restart.ts by its name); 0
  with no known creator; and 163 by test files." Second method over the table rows: `numbers in sentence [2, 1, 1, 1, 1, 6, 1, 0, 163] sum 176`,
  `rows 176`, `byRule equal True`, `mkdtemp 170`; R1's creating file is only `test-model-fixture.ts`, R3's only
  `cdp-browser.ts`. The PR body's list sums to 176.
- [Observed] Pinned: `EXPECTED_AGGREGATE['partition']` is a literal sentence (`assemble_census.py:392-394`); the sum
  check (`:290-292`) is killed by `partition-sum-not-checked` through the `R0-unlisted` fixture, and my mutant turning
  `!=` into `>` is killed too. One fragment, "(N by mkdtemp)", is pinned only against one substitution (N12).

### Section 7, the self-test

- [Observed] The aggregation is in functions (`build_classes`, `exposure_gap`, `exposure_slots`, `exposure_model`,
  `build_table`, `partition_sentence`) that both the self-test and the real run call. `EXPECTED_AGGREGATE` is literal;
  I hand-checked its gap (`0.6`; 2 gaps under two intervals, 6 not, smallest 1.0) and its seven exposure pairs (e.g.
  `nt-`: (0.6 + 2 × 0.6) / 10 = 0.18). The fixture has a mixed class that must stop (`mixedClassStops`), a
  `.testkit.ts` creator (`tk-` → R9), a name whose two rows name different files (`two-` →
  `{'packages/q/src/first.test.ts': 1}`), and mutants of `:382`/`:385`'s successors (`sampled-name-adds-one-gap-not-two`,
  `sampled-name-adds-no-gap`, `never-sampled-name-adds-no-gap`, `never-sampled-name-adds-two-gaps`) and of the sentence,
  all killed, plus round 1's three survivors (`test-file-rule-accepts-a-mixed-class`, `testkit-suffix-not-a-test-file`,
  `creating-file-of-a-name-from-its-last-row`), all killed. `assemble-selftest` and `input-checks` name the new
  assembler sha256 `32f2e944...1fec`.

### Unchanged where it must be

[Observed] `tools/census_diff.py`, round-1 census (`git show e2aae62e:EV/census-2026-10-24.json`, sha256
`39e107b0...8bdb`) against the regenerated one (`b1e0099f...6a22`):
`classes r1 176 r2 176 onlyR1 [] onlyR2 []`, `section moved []`, and every load-bearing field equal for every class:
`{'family': True, 'rule': True, 'disposition': True, 'creatingFiles': True, 'created': True, 'testFiles': True,
'leftAfterSIGKILL': True, 'afterTheNextFreshRun': True, 'leftByTheFreshRunItself': True, 'leftAfterCleanRun': True}`.
Within the 176 rows only `exposureInTheCleanRun` (27 rows, upper bound only) and `topLevelChildrenCarriedFrom` (1 row,
added) differ. The full record diff is 293 paths in 40 groups; every group, and whether it was asked:

| Changed | Asked by |
|---|---|
| `dispositionRules[].why` for R2, R3, R4, R6, R9 (kinds unchanged) | N7 (R2, R4), N3 (R3), N4 (R6, R9) |
| `exposureRanking.meaning`, `.samplerGap` (added), `.top[]` (15 upper, 9 lower, 9 class: re-ranked by the new upper bounds) | F1 |
| `leftBySIGKILL[].exposureInTheCleanRun...upperBound` (27), `namedInTheBeadObservation.*.upperBound` (9) | F1 |
| `leftBySIGKILL[].topLevelChildrenCarriedFrom` (added, 1) | F1 (carry) |
| `finding[0]`, `finding[2]`, `finding[4]` | N2, F2, F1 |
| `followUps[0].guards` (added), F1 `what`, `measure`, `whyNotTriviallySafe`; F2 `what`, `measure` | N3, N4 |
| `limits`: 6 → 8; `limits[0]`, `[1]`, `[3]` changed, `[6]`, `[7]` new; `[2]`, `[4]`, `[5]` unchanged | N1, F1, N6, N2, F1 (carry) |
| `staticCoverage.neverSeen/*` (179 values, 13 list lengths), `sitesWithAPrefixLiteral`, `sitesWithoutOne` (added) | N5 |
| `subject.notRun`; `subject.revision`, `samplerRecordSha256`, `carriedObservationsSha256` (added); `staticSitesSha256`, `toolSha256` of `assemble_census.py`, `collect_runs.py`, `static_sites.py` | N6; the repair's own record; N9; the regenerated inputs |
| `vitestProjectDirectoriesInTheCleanRun` (added) | N7 |

Every difference was asked for or follows from one that was. No class's rule, creator or leftovers moved.

## 5. New findings

### F3 — blocking — F1's acceptance measure cannot measure F1, and only an F1 that drops guard (6) could meet it

- **Evidence.**
  - [Observed] F1's measure, in the record (`followUps[0].measure`) and in the lane's follow-up JSON the coordinator
    files: "census_run.py kill run then --seed-tmp-from fresh run: classes syzygy-poc-browser- and chrome-singleton-directory
    must read stillThere 0 and the marker count 0 (the marker count is a lower bound, see limits)."
  - [Observed] `census_run.py:13-16`: after a kill "every process of this user whose arguments carry the exact
    `--user-data-dir=<private-directory>/tmp/` marker" is counted and "Those are stopped with SIGTERM by pid, repeated
    up to three times". All three kill records show it done before the fresh run: `stoppedByPid` `{'signal': 'SIGTERM',
    'rounds': 1, 'remaining': 0}` in k1, k2 and k3 (the browser `leader` among them: 1 / 3 / 1).
  - [Observed] `census_run.py:18-21`: `--seed-tmp-from` renames every entry "into this run's temp directory" and
    "refuses an earlier directory … whose marker still matches a live process" (the assert in `seed_entries`, line 127).
  - [Observed] PR 515's guard, which F1 must keep ("under PR 515's guard", guard (6)): `isChromeSingletonDirectory`
    requires `dirname(directory) === tmpdir()` (`apps/three-surface-poc/src/cdp-browser.ts:278-279`), and
    `chromeSingletonDirectory` takes `dirname(readlinkSync(link))` of `<profile>/SingletonSocket` and refuses what that
    check refuses (`:312-313`), at `ef7996b5`, which equals main for `apps/`. PR 515's real-Chrome test asserts the link names the launch-time
    temp directory: `expect(dirname(singleton)).toBe(tmpdir());` (`cdp-browser.browser.test.ts:96`). The same file says
    "Chrome unlinks the profile's link as it starts to shut down" (`cdp-browser.ts:273`).
- **Why the measure fails.** (a) When the fresh run's F1 sweep would run, the harness has already stopped every orphan
  and would have refused to seed otherwise, so guards (1)-(5) (refuse while alive, exact argv element, session,
  re-verify, SIGTERM then SIGKILL, re-scan) are never exercised. "The marker count 0" is either the kill run's count,
  taken before any sweep exists (10 / 26 / 8 today, which F1 cannot change), or the fresh run's count of its own
  marker after a clean exit, which says nothing about F1. (b) [Inferred] After the rename, the profile's
  `SingletonSocket` link, if Chrome left it, still names the killed run's temp directory (an absolute path, per the test
  above), and after the harness's SIGTERM it may be gone altogether ([Unknown] which; the stored listings do not record
  children). Either way PR 515's `dirname(...) === tmpdir()` check refuses, correctly, so a correct F1 leaves
  `chrome-singleton-directory` at `stillThere` 1 / 3 / 2. Guard (2)'s exact-argv match also compares a renamed profile
  path with an argument that names the old one.
- **Failure scenario.** The bead is filed with this measure. The implementer runs it, sees the Chrome directory stay,
  and either relaxes guard (6) to follow the dangling link into the current temp directory by basename, the class of
  link-following PR 515's review defended against, or waives the measure; and the bead's evidence reports "marker
  count 0" for a change whose dangerous half, signalling live processes by match, the measurement never touched.
- **Proposed fix.** Replace F1's `measure` (in `FOLLOW_UPS` in `assemble_census.py`, then regenerate the census,
  `assemble-selftest`, `input-checks` and `verification`; and in the follow-up JSON and the PR body) with, for example:
  "census_run.py cannot measure this change as it stands: in kill mode it SIGTERMs every process carrying the marker
  before it writes its record, --seed-tmp-from refuses while any process carries the earlier marker, and seeding
  renames the entries into a new TMPDIR, so the profile's SingletonSocket link and every orphan's --user-data-dir
  argument name a directory that no longer exists and PR 515's dirname(link) === tmpdir() check refuses. Measure F1
  (i) by unit tests over synthetic dead-owner profiles, one case and one rule-6 mutant per guard: a live decoy carrying
  the exact argv element, one carrying it only as a substring, a stopped (T) process, a reused pid, a SingletonSocket
  link that leaves the temp directory; and (ii) end to end only after a harness change for a new set of runs: a mode
  that leaves the killed run's orphans running and starts the fresh run in the same TMPDIR, then reads
  syzygy-poc-browser- and chrome-singleton-directory stillThere 0 and the killed run's marker count 0 after the fresh
  run's sweep." Nothing else in F1 needs to change: the marker and the eight guards are right (section 4, N3).

### N11 — note — the 12 long sampler gaps are not quiet, and the record does not say which bounds rest on them

- **Evidence.** [Observed] With the trace aligned to the sampler clock (`tools/long_gap_census.py`), 445 traced names
  were created inside the 12 gaps of 1.0 s or more and the sampler saw 15 of them (3.4 %); inside the 243 short gaps,
  880 of 1998 (44 %). The last 17.67 s of the run (gaps 133.30-136.82, 136.82-138.85 and 138.85-150.97 s) hold 390
  creations and 1 sighting; the 12.12 s gap alone holds 209 creations (`dossier-cli-` 57, `dossier-status-` 30,
  `rt3-cred-` 29, …) and 0 sightings. [Inferred] Those stretches are busy, not quiet; the data fit either a stalled or
  starved sampler or names that all lived far under a sample, and cannot separate the two. `exposureRanking.meaning`
  says the 12 "cannot be told from a quiet stretch". Of the 30 published mkdtemp-class bounds, 7 rest partly on those
  gaps (`dossier-gate-acts-`, `dossier-origin-`, `dossier-records-`, `dossier-state-`, `syzygy-poc-browser-`,
  `syzygy-poc-surface-fixture-p<pid>-n<ns>-`, `syzygy-poc-surface-fixture-template-p<pid>-n<ns>-`), and of the 4 shape
  classes `nanoid-21` does (7 of 7 names have a sighting edge on a long gap). With the trace-aligned bound (0.05 s
  allowance), `dossier-state-`'s published 1.014 becomes 1.703 and `dossier-origin-`'s 0.252 becomes 0.264; over all
  170 mkdtemp classes, most unpublished, 47 bounds would rise (`dossier-cli-` 0.229 to 4.115). The five of `finding[4]`
  are unaffected (section 4, F1).
- **Failure scenario.** A later sizing reads `dossier-state-`'s `upperBound` 1.014 as a bound, the case round 1's F1
  scenario named, when the stored trace shows that 13 of its names were created inside a stretch the sampler did not
  see.
- **Proposed fix.** In `exposureRanking.meaning`, replace "cannot be told from a quiet stretch" with what the trace
  shows (the counts above, computed by the assembler), say why a gap under two intervals is a single period (the
  sampler sleeps a full interval between listings), and list the published classes whose bound depends on the
  assumption; or carry a second, trace-aligned upper bound per class with its latency allowance stated. Add to
  `finding[4]` that its five do not depend on the assumption. N1's follow-up (record each sample instant) removes the
  question for new runs. If F3 is repaired, this can ride the same regeneration.

### N12 — note — the aggregation fixture does not pin the leftover counts or the fresh-run figures

- **Evidence.** [Observed] `tools/my_mutants.py`, eight mutants of the aggregation code at `ef7996b5` (assembler sha256
  `32f2e9449b540ef5d387b10097afa4fd296461aab8fc61cf0879a743a1144fec`; `my-mutants.json` stores each `old`/`new`).
  Killed by the fixture: `gap-from-first-sightings-only`, `gap-takes-the-smallest-single-gap`,
  `sampler-only-names-dropped-from-exposure`, `sum-check-only-catches-too-many`. Survived, with the effect of each on
  the real record when the full assembler runs it over the stored runs:
  - `kill-leftover-count-doubled` (`slot['entries'] += 1` → `+= 2`): 121 paths change, among them every
    `leftAfterSIGKILL/*/entries` and `afterTheNextFreshRun/*/stillThere`;
  - `kill-leftovers-not-reported` (`'leftAfterSIGKILL': killed_left,` → `{},`): 10 paths, `leftBySIGKILL` empties;
  - `seed-entries-counted-as-the-runs-own` (`item['leftFromSeed' if name in seed_names else 'leftAtEnd']` →
    `item['leftAtEnd']`): 104 paths, every `stillThere` and `bytesStillThere`;
  - `mkdtemp-count-includes-derived`: `finding[2]` changes ("(171 by mkdtemp)"); the aggregation fixture has no derived
    or fixed class.
  `EXPECTED_AGGREGATE` has no leftover, fresh-run or seed key, and `AGG_RECORDS` has no seeded run. These are the bead's
  own acceptance figures ("the per-prefix counts after one SIGKILLed run") and exactly the fields F1's and F2's
  measures read (`stillThere`, `leftBySIGKILL`). Today's figures are not in doubt: the record re-runs byte-identically
  and round 1 recomputed the kill counts by a second method.
- **Proposed fix.** Add to the aggregation fixture a third, seeded run (`seededFrom` naming `k`, one entry moved in
  that stays and one that goes) and literal expected `leftAfterSIGKILL`, `afterTheNextFreshRun` and
  `leftByTheFreshRunItself` for two classes, plus a derived name; add the four mutants above. Do it no later than the
  first PR that uses this assembler as acceptance evidence for F1 or F2.

### N13 — note — F2's first non-vacuity branch cannot be read as worded once F2 works

- **Evidence.** [Observed] F2: "The kill must be non-vacuous: it must leave at least one R9 entry and one R6 entry, or
  synthetic dead-owner roots are seeded". The census lists only the direct entries of the private temp directory
  (`listingAtEnd`). Under F2's own mechanism the worker sets `process.env.TMPDIR` to an owner-pid root, so R9 and R6
  entries are made inside that root and a kill leaves the root, not an R9 or R6 entry, at the top level. The worker
  setup file is `vitest.setup.ts` at the repository root (`vitest.config.ts:32`); a root it makes has a creating file
  outside `apps/`, `packages/` and `scripts/` that is not a test file, so R6 and R9 both refuse it and `disposition()`
  stops the assembler (`raise SystemExit(f'no disposition rule …')`, `assemble_census.py:146`). F2 also says "one fresh
  run in the same private TMPDIR", while `census_run.py --seed-tmp-from` uses a new one.
- **Failure scenario.** F2 lands and works; the measurement reports the kill as vacuous (no top-level R9 or R6 entry),
  or the assembler stops on the root's class, and the criterion can be met only through the seeding branch.
- **Proposed fix.** Word the first branch as "the kill left at least one dead-owner root holding an entry of an R9
  class and one of an R6 class (read by listing each root's children, which census_run.py does not do today)"; say
  that the assembler needs a rule for the root's class before it can measure F2; and say "a fresh run started in the
  killed run's leftovers" rather than "the same private TMPDIR". Testable as filed through the seeding branch, so a note.

## 6. Every changed output

None. [Observed] `git diff --name-status a088f1ca ef7996b5` is 41 `A` rows, all under `EV/`; the directory is cited
only from inside itself (5 of 5 citers in `EV/`); no module, rendered page, route, machine body, ETag, wire format,
refusal string, exit code, signed or digest-bound artifact, spec, consent or retention decision changes. Both gates I
ran give the results the verification record gives.

## 7. Verdict per acceptance criterion

`syzygy-bpyt.4.18` (as quoted in round 1): "A committed census record names the commit in full, the per-prefix counts
after one SIGKILLed run in a private TMPDIR, and the creating file for each prefix. Each prefix has a recorded
disposition: a sweep, a test-kit temp root, or a stated residual."

| Criterion | Verdict | Basis |
|---|---|---|
| Names the commit in full | **Met** | `subject.treeCommit` `a864e999645a071dda40325b2235976590e02973`; every run record and the static census name it (the assembler refuses otherwise, input checks) |
| Per-prefix counts after a SIGKILLed run in a private TMPDIR | **Met** | unchanged from round 1 for all 176 classes (`leftAfterSIGKILL: True`); the record re-runs byte-identically. Not pinned by the self-test (N12) |
| Creating file for each prefix | **Met** | `creatingFiles: True` for all 176, unchanged |
| A disposition for each prefix | **Met, conditionally** | 176 of 176, rules unchanged; R6/R9 (169 classes) now say they hold once F2 is lodged on `syzygy-bpyt.4.4` |
| Findings follow from the tables (round 1 F1, F2) | **Met** | F1: every published bound reproduced at 0.61 s; `finding[4]`'s figure holds without the gap assumption. F2: parts sum to 176. The long-gap disclosure is imprecise (N11) |
| Round-1 repair list (F1, F2, section 7, N1-N10) | **Met** | section 4 |
| Follow-up texts safe and testable to file | **Not met** | F1's marker and guards are right, its measure is not (F3); F2 testable through its seeding branch (N13) |

Per the stopping rule: F3 is blocking, so the lane repairs it once and a narrow round 3 checks only that repair.

## 8. Cleanup

- Deleted: the scratch clone `SP/rev-522b/clone`; the round-1 and round-2 census copies I extracted (`census-r1.json`,
  `census-r2.json`, re-derivable with `git show <commit>:EV/census-2026-10-24.json`, digests in section 4); the two
  re-derived diffs (digests in section 1); and every private directory `/tmp/r522b-1`, `/tmp/r522b-s` (by me) and
  `/tmp/r522bi`, `/tmp/r522b-m`, `/tmp/r522b-p1` (by the tools that made them). `ls -d /tmp/r522b* /tmp/r522bi`:
  "No such file or directory". Nothing else in `/tmp` was touched. No process was started that outlived its command;
  nothing was killed.
- No file in any worktree under `/home/tze/GitHub/syzygy/.worktrees/` was read for editing or edited.
- Kept, all under `SP/rev-522b/` (sha256 by `sha256sum`; this raw's own digest is in the reply):

  | File | sha256 |
  |---|---|
  | `tools/bound_all_classes.py` | `06c25b07e2a1d910a9fa798edec365fad956d39fb28da32143d555abb3ba5139` |
  | `tools/bound_rederive.py` | `e695b40abb4fd26198a8cadbcccccb6e254bcee64d2bf000ea6eadcc48372ce3` |
  | `tools/carried_checks.py` | `5b364173b2a6b707e874767cda66f89a4f676cdcedf0883b0da34b6857f2ce6f` |
  | `tools/census_diff.py` | `670786058fa891bed214abd1ecbfc9c9c8c7be9a56593446108602a037d5c15b` |
  | `tools/guards_verbatim.py` | `1c6b24bb1d6d6966a0602051e76d816a2ae91882f92cf33c7623507a071b76d6` |
  | `tools/long_gap_census.py` | `dfeffc2f0d7c7b61357929b89164606e4f52b0512d4327cd2f08f1c3bdedc809` |
  | `tools/my_mutants.py` | `46b84d02ee886d0de05c5c5e0caa143d4fcf8f8ad58eb2557b2ee95b6ed7ca84` |
  | `tools/published_dependence.py` | `043608a320913e6cce063ca85c9f7df361442868f50a3a8dbf923ddf888c03d8` |
  | `assemble-rerun.out` | `670f58b2dd3f104c432eaf7908295e972f5cd028b362db3477f038169bd1186c` |
  | `assemble-selftest-rerun.json` | `467b41d0779e70bebe27bf118caf83f7686cbc2406e90be252965323a933da3d` |
  | `bound-all-classes.json` | `661cb91cc9a412d226a350ce10d2d5783fa695d9da7690a06bbd5e7a1f7b39b1` |
  | `bound-rederive.json` | `e266f126763b473c076bd737caae5d8c7632e94ba3711005a3518346a3270552` |
  | `carried-checks.out` | `d26cb0ebc77d1bc3197ee5260342e5d2b981fc201175e3cef35c8a420402e1df` |
  | `census-diff.out` | `e3a7fbf176a848a244b9bd21997deff2f62e97af1e68caf88f89e2d5b7c9eccb` |
  | `census-rerun.json` | `b1e0099f80cbc950e7eff1a6f9c64d30c6bb128ca1efce76e849d50138d36a22` |
  | `gate-governance.log` | `35e66941ecd790469df7929030c6f80c457ed99ba0359956c053dd3025e9ba0c` |
  | `gate-quotations.log` | `e15ea08dc603f427665fa899aef5adcaca1bea8119176a394da15869bb83dde2` |
  | `guards-verbatim.out` | `f722a525f1c67246f057283317e1460da2e780041c72a32f4c6c9a4b67fc2d1d` |
  | `input-checks-rerun.json` | `f8548e8fd3dd8fdb1cd362920a57d69312c35dd288826bf64450bf2e62a2e187` |
  | `input-checks-rerun.out` | `9e11dccc9aeac0c9ffe127941c2d70be4b0ae4ee402f3460e002eea145eb3cd0` |
  | `long-gap-census.json` | `94e000b94b5051e34fbb04cde4100f310a12d736e07ba4d61ed6f6fc2b3bd5a3` |
  | `my-mutants.json` | `d4774cc997aa90ee19f210a8cabb262ea59fd49cac0ccabf7deca51fa07213f5` |
  | `npm-ci.log` | `d10275741ededc3115f459c96db72da571e9d8dc9211740789b5a9d05f5b603e` |
  | `pr-body.md` | `f2e0edda085d98b536ec8fdfc503930b4dc96b633c61914b7a1c5bec89c1599d` |
  | `published-dependence.json` | `115e068207af934b621f284c67dd88705e4882ff0bd3d2d447a41b8b43af48a8` |
  | `shape-edges.out` | `788beaa17eaad64b8819e4ba77815d560116923a72d20a58965668ef7cebacb7` |
  | `static-rerun.json` | `f5ad2571ddf5b9caab1aafb5c9de3a70d94fdf6a9992af2faa789672b24a2a69` |
  | `static-selftest-rerun.json` | `5317528c225d377fe3c2a528c21461076d96a57bb346ebb98a026f7f2a173303` |

  `census-rerun.json`, `assemble-selftest-rerun.json`, `static-rerun.json` and `static-selftest-rerun.json` are
  byte-identical to the committed files of the same role. `shape-edges.out` came from an inline script (sighting edges
  of the four shape classes); its logic is the `edge_on_long` predicate of `tools/published_dependence.py` applied to
  sampler-only names. `my-mutants.json` stores each mutant's `old`/`new`; the fragments apply to `EV/assemble_census.py`
  at `ef7996b5` (sha256 `32f2e9449b540ef5d387b10097afa4fd296461aab8fc61cf0879a743a1144fec`), and `tools/my_mutants.py`
  regenerates the mutant copies.
