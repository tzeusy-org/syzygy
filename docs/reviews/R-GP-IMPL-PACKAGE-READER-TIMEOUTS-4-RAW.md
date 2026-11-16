# R-GP-IMPL-PACKAGE-READER-TIMEOUTS-4 — CC-REV-1 implementation review of syzygy-bpyt.4.13, round 4
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: d6b04c5f
Subject: r4-review.diff sha256 b7d11dbc9a20dd707e14ae58ed6ddb21001820f1aea260bd5e08c304ef980dc3

Reviewer: fresh-context CC-REV-1 reviewer (rev-520d), 2026-10-25. I did not write this change or any earlier round, and I changed
nothing in it. I fetched no target repository content and opened no credential file. I worked in two scratch clones under
`rev-520d/`: `clone` for the probes, and `clone2` for the gates and the battery. Every suite ran under its own `/tmp/r520d-*`
TMPDIR. Each probe attempt ran under the probe's own `/tmp/r520c-*` directory (the prefix is in round 3's tool, which I did not
change beyond the pin), and the probe removed it. Both clones and all of these directories are deleted (§7).

This round is narrow. It checks only the delta `e7f3c71e..d6b04c5f`: taking `--profile` out under the stopping rule.

Why CONFIRM WITH EXCEPTIONS:
- **The removal is exact.** I applied round 3's F4 "What has to come out" list, item by item, to the `e7f3c71e` script and got
  the `d6b04c5f` script: "differences beyond the list: none". Each of the 51 old lines removed or changed is on a list. Every
  "What stays" item is present byte-equal, the reader thread included. A rule-6 self-test of the comparison catches all four of
  its mutants.
- **Nothing that stays broke.** 33 attempts ran the head script without `--profile`. All 33 left the tree clean and no process
  surviving. The only non-pass is MIX-np `write`, which has no trigger without `--profile`, as in round 3. Three mutants of kept
  code are each killed by the probe round 3 used for the repair the mutant reverses. Gates, battery and hosted CI are green at
  the head.
- **No dangling reference.** `measure-restore-probes`, `probe_measure_restore` and `KIT_` occur in 0 of the head's 3,699 tracked
  files. `--profile` occurs in 3, all about Codex's CLI flag. The other hits are records that stay, or unrelated files (§3).
- **The PR body says what happened.** Its "Stopping rule applied" section is accurate, and N10 is fixed. No sentence describes
  the restore or `--profile` as present.
- **Notes only, N12–N16:**
  - N12: the dead line 92;
  - N13: one stale justification in the PR body;
  - N14: `--profile` is now silently ignored;
  - N15: two stale or loose PR-body figures;
  - N16: recovery of the removed code depends on #520 landing by merge commit.
- Under the owner's notes-only rule, this round clears the bytes it reviewed.

## 1. Subject identity checks

Tool: `tools/check_identity.py`. Output: `check-identity.txt`.

**Frozen files.** [Observed] `sha256sum` gives:
- `lead/b413/r4-review.diff`: `b7d11dbc9a20dd707e14ae58ed6ddb21001820f1aea260bd5e08c304ef980dc3`;
- `lead/b413/r4-delta.diff`: `4ce87af134fe3d426db6eae40deded585e4e439e5a468ecc0a1f51445230588b`;
- round 3's raw: `10c206a8925aa0ac7eb5e35038dadcc067653f98ebbbd981137f0c15ca3e1c86`.

All three match the brief.

**Re-derived diffs.** [Observed] In `clone`, after fetching `agent/syzygy-bpyt.4.13` and `main` from GitHub:
- `git diff df6046a1 d6b04c5f`: "r4-review.diff: … derived sha256 b7d11dbc… byte-equal True". 13 files, +38032/-16.
- `git diff e7f3c71e d6b04c5f`: "r4-delta.diff: … derived sha256 4ce87af1… byte-equal True". 3 files, +12/-2741:
  - `measure-restore-probes.json` 0/2468 (deleted);
  - `tools/probe_measure_restore.py` 0/222 (deleted);
  - `scripts/measure_vitest_test_durations.py` +12/-51.
- The delta is one commit: `d6b04c5f remove --profile from the measurement script and its restore probes, per the stopping rule
  [syzygy-bpyt.4.13]`.
- `git diff --name-status e7f3c71e d6b04c5f` over the whole tree lists only those three paths.

**Branch and main.** [Observed]
- `git ls-remote` gives `d6b04c5f03978b2a8fbc87afc61c725d91eca0f4` for `agent/syzygy-bpyt.4.13`, and `gh pr view 520` gives the
  same head, OPEN.
- `ls-remote` gives main `a088f1caf061c1a2062527ce8521c9b64c3c7fd1`, as the brief says, and `git merge-base d6b04c5f a088f1ca`
  is `df6046a1`.
- **No file main changed is a subject path.** `git diff --name-only df6046a1 a088f1ca` lists 300 paths. Their intersection with
  the 13 subject paths is empty, checked two ways: a Python set gives `intersection []`, and `sort | uniq -d` gives 0 lines. None
  of the 300 is under `packages/polaris-generation-consent/`, is a `vitest.config`, or is a `scripts/measure_*` or
  `scripts/size_vitest*` file.

**Script digests.** [Observed] `scripts/measure_vitest_test_durations.py` hashes to:
- `72a0fabdd0dd12f85ad35fde4b3ee032125757d5276b85802d76fdf5288f0195` (155 lines) at `e7f3c71e`;
- `7799aa73bae9a4790b75b85a597c57bf07aab4bb4dab6c67570e69af7535128e` (116 lines) at `d6b04c5f`.

The second is the pin the lane names in PR body line 155.

## 2. Clauses relied on, and the class ruling

**CC-REV-1** (`.syzygy/governance/policies/craft-and-care/review-and-documentation.md:18-51`, at `d6b04c5f`):
- "Changes touching any of seven classes require review by an independent, fresh-context reviewer, and the agent performing the
  change never finally decides which classes it touches."
- Class 4: "**security** — anything under SEC-1…SEC-5, auth surfaces, egress paths;"
- Class 6: "**public interface** — machine-queryable endpoints, adapter contracts, anything an external consumer can depend on;"
- "**The change record states** which classes the change touches, or "none," so a misclassification is a findable violation after
  the fact."
- "**A reviewer or the owner** may reclassify at any time."

**GP-Q0, Part 1** (`.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:52-55`): ""Behavior-
preserving" means none of the following changes: a rendered byte, a wire format, a refusal string or an exit code; a signed or
digest-bound artifact; a consent, security or retention decision."

**The owner's notes-only stopping rule** (`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md:48-53`):
- "A confirmation round clears the exact bytes it read when it raises no revise-severity finding, that is, nothing that asks for a
  change. Such a round returns either `CONFIRM` or `CONFIRM WITH EXCEPTIONS` with notes only."
- "Its notes are dispositioned in a record beside the package, never by editing the reviewed bytes. Editing them would retire the
  clearance."

**AGENTS.md** at `d6b04c5f` (lines 120-135 and 263-265):
- Rule 2: "No "zero / all / 100%" claim without running that exact sweep this session, confirmed by a second method. Enumerate
  remainders."
- Rule 6: "Mutate the input and confirm the check fails, per predicate, before trusting it".
- Rule 9: "A claim of absence needs a sweep with a denominator."
- Rule 11: "An evidence record names its subject and the subject's digest; a record that names neither cannot be re-checked
  against the bytes it describes."
- Guardrail: "A rule-6 evidence record must store each mutant's `old`/`new` fragment and the commit it ran at; ids and outcomes
  alone are not re-runnable, and a rebase-merge leaves the recorded commit reachable from no ref."

**Class ruling: none, confirming rounds 1–3. The removal does not change it.**
- [Observed] The delta changes one evidence script and deletes one evidence record and one evidence tool (§1). It touches no file
  under `apps/**` or `packages/**`, and no `vitest.config.ts`, workflow, `.syzygy/**` or `openspec/**` file.
- [Observed] At the head, the measurement script is named by 8 of the 3,699 tracked files (`sweep.txt`):
  - the six duration records;
  - the script itself;
  - `scripts/size_vitest_test_timeouts.py`.

  None of the 8 is a workflow, manifest, battery line or `PROJECT-STATUS.md`. So no gate runs it.
- Class 4 stays adjacent and untouched. The consent package's test file is not in the delta.
- Class 6 does not apply. The script is an evidence tool new in this PR (`+116/0` against the base), so no external consumer of
  `main` can depend on its flags or its record shape.
- GP-Q0: §6.

## 3. What I ran, and the results

Load1 ranged from 14.09 to 59.36 on 12 cores across the 20 batch-boundary readings in the three probe logs. Other reviewers and
lanes ran beside me.

**Exactness** (`tools/check_exactness.py`; output `check-exactness.txt`).
- The tool rebuilds the head script from `e7f3c71e`'s by applying each F4 removal item as a literal edit, then compares the
  result with the `d6b04c5f` bytes:
  - code lines are compared byte for byte;
  - the two docstring paragraphs that the list edits mid-paragraph ("Stopping:" and "Cleanup,") are compared after whitespace
    normalisation, since the list does not say how to re-wrap them.
- [Observed] Result:
  - "expected lines 112, actual lines 112; differences beyond the list: none";
  - "paragraph "Stopping:" equals the list applied (normalised): True";
  - "paragraph "Cleanup,"  equals the list applied (normalised): True";
  - "old lines removed or changed: 51 -> [4, 12, 13, 14, 15, 16, 19, 20, 21, 24, 25, 26, 28, 29, 39, … 155]";
  - "of them on neither list: none".
- [Observed] The re-wrap only narrows the docstring: its widest line is 147 characters at `e7f3c71e` and 140 at the head.
- **Rule 6** (`check-exactness-selftest.txt`, inputs under `selftest/`). Each mutant is a one-fragment edit of the head bytes:
  - mx1 restores " and restored" in the stop message (a listed byte left): "differences beyond the list: 5";
  - mx2 deletes line 92 (an unlisted byte removed): "differences beyond the list: 4", and "line 127 `stdout = ...` (on neither
    list)" becomes "False";
  - mx3 restores "before instrumenting, " in the docstring: "paragraph "Stopping:" equals the list applied (normalised): False";
  - mx4 changes `time.sleep(0.2)` to `0.5` in `end_group` (kept code changed): "differences beyond the list: 5", and "end_group
    (80-96)" becomes "False".

  The unmutated copy reproduces the `git show` run line for line ("unmutated copy: output identical to the git-show run").

**Dead names** (`tools/dead_names.py`, an AST pass; output `dead-names.txt`). This is a second method beside `grep`, since
`pyflakes` is not installed. [Observed]
- "r3.py: 0 stored-never-loaded names";
- "head.py: 2 stored-never-loaded names: [('<module>', 'stdout', 92), ('one_run', 'stdout', 92)]". This is one store on one line,
  reported once per scope that the tool walks.
- "mx2-unlisted-line-removed.py: 0 stored-never-loaded names".

`grep -n -w -E "stdout|output"` over the head script gives lines 39, 40, 78, 82, 83, 92 and 109. Only line 92 reads `output`
outside the reader thread, and nothing reads the `stdout` it assigns.

**Probes, head, no `--profile`.**
- Tools: round 3's own tools, copied to `tools/r3/`. The one change is `probe.py`'s pin for the head script, from `72a0fabd…` to
  `7799aa73…`.
- I copied `probe-wave3.py` (`d9910d05…`) as `probe.py`, since that is the version round 3 says ran its `-np` batches. The lane
  copied the final `probe.py` (`484618ae…`) instead.
  - [Observed] `diff` shows the pin as the only difference between my copy and `probe-wave3.py`.
  - [Observed] The lane's copy also differs from round 3's final `probe.py` only in that pin. I checked all 23 files in its copy
    with `cmp`.
  - The other six tool files are byte-identical to round 3's.
- Logs: `probes-head.log` and `probes-badutf8.log`. Records: `probes/<batch>/`. Table: `probes-summary.txt`, from
  `summarize_probes.py`.
- I added two batches that round 3 ran only with `--profile`: K-np, to pair with mutant mk3, and BADUTF8-np, to see N9 at the
  head.

| Batch | Attempts | Clean, 0 survivors | Passed | Exit codes | Note |
|---|---|---|---|---|---|
| P0-np (run to the end under `strace`) | 1 | 1 | 1 | 0 | 299 tests, 0 profile rows. `scriptWritesOutsideAllowed` is `[]`. The write set is tempfile's probe, the TemporaryDirectory, `/dev/null`, `report.json`'s unlink and the `rmdir`, and `<tmp>/measure-out.json`, with no tracked file. |
| G-np (two SIGTERMs 0–1000 µs apart) | 18 | 18 | 18 | 143 ×18 | |
| EARLYS-np (SIGTERM 0–400 ms after spawn) | 8 | 8 | 8 | −15 ×6, 143 ×2 | Each −15 record has 0 trace lines, so the script died before line 27 installed the handlers (round 3's N8 case). The lane and round 3 got −15 ×3. [Inferred] Python start-up was slower at my load1 of 21.9–30.2. |
| MIX-np | 3 | 3 | 2 | `write` 0, `run` 129, `cleanup` −15 | `write` was not exercised: it has no trigger without `--profile`, and 0 signals were sent. `run`: `stopped [1, 2, 15]`, lowest-numbered first. `cleanup`: the trace logs "exit 130", and the process then died by −15. Both are N8 cases. |
| H-np (SIGHUP, inherited ignored) | 1 | 1 | 1 | 0 | 299 tests recorded |
| K-np (killpg ESRCH race) | 1 | 1 | 1 | 0 | `KILLPG … 0 -> ESRCH, answered alive (injected)` then `KILLPG … 15 -> ESRCH`; 299 tests |
| BADUTF8-np (fake `npx`, one 0xff byte) | 1 | 1 | 1 | 0 | The thread's `UnicodeDecodeError` is printed, and the run is recorded from vitest's report (§5, N12) |

**Head totals.** [Observed]
- `probes-summary.txt`: "head attempts 33 dirty 0 with survivors 0" and "head stop attempts with a record written 0".
- Second method, the log lines: "attempt lines 32; tree clean 32; 0 survivors 32; FAIL 1; records 32" over `probes-head.log`,
  plus BADUTF8-np's one line in `probes-badutf8.log` ("tree clean, 0 survivors of 2 seen"). That makes 33 of 33.
- The one FAIL is MIX-np `write`, unexercised.
- The lane's own run is in PR body lines 148-155. Mine agrees on every pass count. It differs in timing-dependent exit statuses
  (EARLYS-np, MIX-np), all of them cases round 3's N8 already lists.

**Mutants of kept code.**
- Round 3 had one mutant, `m1`. It drops `start_new_session=True` from the restore's `git checkout`, which this delta removes, so
  it cannot be re-run.
- I wrote three one-fragment mutants of kept code. Each reverses a round-2 repair and runs against the probe round 3 used for that
  repair.
- Mutants: `tools/r3m/mk*_measure_vitest_test_durations.py`. Record with `old`/`new`, base commit and digests: `mutants.json`. Log:
  `probes-mutants.log`. Records: `probes-mutants/`.
- The probe for them is `tools/r3m/probe.py`: my pinned copy plus three `SCRIPTS`/`DIGESTS` entries, the same pattern round 3
  used for `m1`.

| Mutant (base `d6b04c5f`, `7799aa73…`) | What it reverses | Probe | Result |
|---|---|---|---|
| mk2 (`886448b3…`): line 27 installs the handler unconditionally | N7 | H-np ×1 | **Killed**: exit 129, "stopped by SIGHUP: the run in progress, if any, was ended and is not recorded" (the head gives exit 0, 299 tests) |
| mk3 (`5c27d138…`): `signal_group` without `except ProcessLookupError` (lines 58-59) | F3 (b) | K-np ×1 | **Killed**: exit 1, traceback ending "ProcessLookupError: [Errno 3] No such process" from `end_group` (the head gives exit 0, 299 tests) |
| mk6 (`fab589c0…`): line 27's handler appends, then calls `sys.exit(128 + number)` | F2 / F3 (a) | G-np ×9 | **Killed** 1 of 9: at a 150 µs gap, 10 survivors (`npm exec vitest run …`, `node (vitest)`, …), tree clean. The head passes 18 of 18. |

- [Observed] Only mk6 left survivors. The probe sent each of its 10 SIGKILL by PID, and all 10 were gone afterwards. The tree was
  clean, and no `.git/index.lock` was left.

**Gates at `d6b04c5f`** (in `clone2` after `npm ci`, exit 0; the sizing extras in `clone`).

| Gate | Result |
|---|---|
| `size_vitest_test_timeouts.py --check` with the six inputs `timeout-sizing.json` names | Exit 0, "299 collected, 16 sized (10 from a lower bound), 0 problems" (`sizing-check-head.log`). Compared with the committed record: "keys equal True", and the only difference is `subject` `commit` (`d6b04c5f…` against `48ee832a…`) (`sizing-check-compare.txt`). This reproduces PR body line 147. |
| The same `--check`, with a record the head script wrote added as a fourth `--record` | Exit 0, the same line (`sizing-with-head-record.log`). A head record, with 9 top-level keys and no `profile` or `instrumentation`, is read without error. |
| The head script run with the removed `--profile` flag (`--mode alone --runs 1`, `clone`) | "run 1: exit 0, 27.1 s, load1 {'start': 55.21, …}, 299 tests of the file, 0 failed", exit 0. Top-level keys `['bead', 'host', 'mode', 'project', 'runs', 'schema', 'script', 'subject', 'text']`. The tree was clean afterwards (`profile-flag-run.log`, `head-record-profile-flag.json`; N14). |
| `python3 scripts/check_governance.py` | Exit 0, "32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted" (`check-governance.log`) |
| `python3 scripts/check_quotations.py` | Exit 0, "36 quotations examined in 17 of 939 .md files scanned (loc-paren-quote 2, loc-colon-quote 24, quote-paren-loc 10), 0 findings" (`check-quotations.log`) |
| PROJECT-STATUS battery (`tools/battery.py`, round 3's tool unchanged) | "commit=d6b04c5f03978b2a8fbc87afc61c725d91eca0f4 commands=110 nonzero=0". "block lines 114, skipped 2, assignments 2; tree after: clean" (`battery.log`, `battery.json`). The only last line with "FAIL" other than "0 FAIL" is "7 of 7 predicates without FAIL; PASS — counts derived, not asserted". |
| Hosted CI at `d6b04c5f` | `gh run list --commit d6b04c5f…`: `governance-docs` completed success, `node-ci` completed success. `gh pr checks 520`: `checks` pass, `node` pass. |

I did not re-run the file alone, its project or `npm run typecheck`. [Observed] The delta touches no TypeScript, JSON test input
or package file (§1). So round 3's results for them at `e7f3c71e` describe the same bytes.

**Sweep for dangling references** (`tools/sweep.py`; output `sweep.txt`; rule 9).
- Population: every tracked file at the head. "tracked files (ls-files) 3699; blobs in HEAD tree 3699; equal sets True", and 0
  symlinks.
- Method 1 is a Python substring test over each blob from `git cat-file --batch`. Method 2 is `git grep -F -l -a` at `HEAD`. They
  agree for every token ("equal True").

| Token (case-sensitive literal) | Files at head | In this PR's paths | Where the hits are |
|---|---|---|---|
| `--profile` | 3 | 0 | `dossier-local-cli-subprocess-runner/SEMANTIC-DELTA.md:262` and `R-DOSSIER-CLI-SUBPROCESS-1/4-RAW.md`, each about Codex's `-p, --profile` |
| `instrument` | 233 | 6 | `"instrumentation": null` in the five unprofiled records, and `"instrumentation": [` in `before-profile.json`. They are written by `0ef82cd0…` and stay by design. |
| `measure-restore-probes` | 0 | 0 | — |
| `probe_measure_restore` | 0 | 0 | — |
| `KIT_` | 0 | 0 | — |
| `FILE_` | 46 | 1 | `tools/sizing_check_mutants.py:18,40` (`FILE_MUTANTS`), the sizing check's own mutant list, unrelated to `FILE_OLD`/`FILE_NEW` |
| `PROF` | 79 | 1 | `before-profile.json:32`: the record's own `instrumentation[].new` fragment, which stays by design |

- "PR paths" are `docs/evidence/syzygy-bpyt-4-13/`, the two scripts and the test file.
- [Observed] 8 files name `measure_vitest_test_durations`: the six records and the two scripts. None of them is outside the PR's
  paths. Of the 23 files naming `bpyt.4.13`, none carries `--profile`, and none carries `instrument` or `PROF` about this script:
  `docs/README.md`'s hits are "profile gate" table rows and "the two instruments".
- **The deleted files' stems.** [Observed] `git grep -F` of `measure-restore`, `probe_measure`, `measure_restore` and
  `restore-probes` at the head returns nothing, which also rules out a citation wrapped across a line break.
  - At `e7f3c71e`, each deleted name was cited only by the two deleted files themselves.
  - Their `e7f3c71e` sha256 prefixes (`4179e354465b`, `7c75621a7dc0`) are cited in 0 files at the head. So are the old script's
    (`72a0fabdd0dd`) and the head script's (`7799aa73bae9`).
- **PR body** (`pr-body.md`, sha256 `eec463aa84dc53708a45de5e80cd45c617cc651f3f97c55e78cd224a7537958b`, 180 lines). It is
  byte-equal to the lane's `pr520-live-r4.md`.
  - `--profile` appears on 8 lines (13, 31, 35, 38, 44, 45, 140, 152). Each says it was removed, moved, or has no trigger.
  - `instrument` appears on 6. Lines 13, 35, 39 and 41 describe what was removed, and line 23 a step not taken. Line 69 is round
    0's scratch instrumentation, "not retained".
  - `measure-restore-probes` and `probe_measure_restore` appear on line 45 only ("Deleted: …"), and `PROF` on line 41 only ("the
    `PROF` parse … " in the removal list).
  - `KIT_` and `FILE_` appear on 0 lines.
- **Bead `syzygy-bpyt.4.24`**, read-only. I swept two sources:
  - `bd show syzygy-bpyt.4.24 --json` (`bead-4.24.json`), whose fields carry no comments;
  - the one comment, from `bd show` text (`bead-4.24.txt`), with its wrapped lines joined (534 characters).
- [Observed] `--profile` occurs once in the JSON fields and 3 times in the comment. The other six tokens occur 0 times in either.
  - The description's one use: "Measure with the committed scripts/measure_vitest_test_durations.py (without --profile, which PR
    #520 removed under its round-3 stopping rule; see syzygy-bpyt.4.27)".
  - The comment (headed "Coordinator 2026-10-25", stamped 2026-10-24 18:48) uses it 3 times, as "moved --profile out of #520",
    "F4 in --profile's restore" and "the script without --profile".
  - So round 3's concern about "with its F1 restore repair" is answered in the bead itself.

## 4. The removal, item by item against F4's two lists

Round 3's raw, F4, lines 340-377. Head line numbers are `d6b04c5f`'s. The hunks are those of `r4-delta.diff`.

**"What has to come out"** — every item is gone. [Observed] (§3, exactness tool)

| # | F4 item (line numbers at `e7f3c71e`) | Delta hunk | At the head |
|---|---|---|---|
| 1 | line 4's ` [--profile]` | `@@ -1,7 +1,7 @@` | Line 4 ends `--out OUT.json` |
| 2 | docstring lines 12-15 (the `--profile` paragraph) | `@@ -9,24 +9,16 @@` | Gone, with its blank line 16 |
| 3 | "before instrumenting, " on line 19 | same | Line 14: "before starting vitest, or within 0.05 s while vitest runs". The paragraph equals the list applied. |
| 4 | lines 25-26 (the `git checkout` restore sentence, which begins at the end of line 24) | same | Gone. Lines 17-19 keep the rest of the paragraph, ending "A process that has left vitest's process group is out of the cleanup's reach." |
| 5 | lines 28-29 become "It writes only OUT.json. A SIGKILL of the script itself can leave vitest running." | same | Line 21, verbatim |
| 6 | `KIT_OLD`, `KIT_NEW`, `FILE_OLD`, `FILE_NEW` (39-50) | `@@ -36,44 +28,21 @@` | Gone. `KIT_` occurs in 0 tracked files. |
| 7 | `profile` and `'--profile' in args` on line 57 | same | Line 37 assigns six names, without `profile` |
| 8 | `instrument()` (63-72) | same | Gone, with its blank line 73 |
| 9 | " and restored" in line 76's message | same | Line 45: "…was ended and is not recorded" |
| 10 | `written` (line 109) and line 112 | `@@ -106,10 +75,9 @@` | Line 78 is `proc, output = None, []`. The `instrument(written)` line is gone. |
| 11 | the inner `try`/`finally` and the `git checkout`, lines 120 and 122-123 (line 121's `end_group` call stays) | `@@ -117,10 +85,7 @@` | Line 88 is `if proc is not None: end_group(proc)`, the old line 121 dedented one level |
| 12 | the `PROF` parse and `run['profile']` (131-132, 137) | `@@ -128,13 +93,10 @@` | Gone |
| 13 | the `profile` and `instrumentation` keys of OUT.json (147-148) | `@@ -144,12 +106,11 @@` | Gone. Line 109 has no `'profile'`, and the `instrumentation` line is gone. |
| 14 | Optional: vitest's stdout to `/dev/null` and the reader thread out (115-116) | — | Not taken, as the coordinator instructed (PR body line 44) |
| E | Evidence: `measure-restore-probes.json` and `tools/probe_measure_restore.py` | the two `deleted file mode 100644` hunks | Deleted. Citers: §3. |
| B | PR body items (round 3's line numbers, in `rev-520c/pr-body.md`) | — | Each is handled. Old line 13's instrumentation sentences are replaced by line 13's "Since round 3 the script has no `--profile` mode". Old line 14's rule-6 bullet is gone. The old record paragraph and table (30-46) are gone. Old line 29's `git checkout` sentence is gone, and its ESRCH half is kept (line 28). "or inside the cleanup" occurs 0 times (1 at round 3). Old line 47 is reworded (line 29). Old line 49 becomes line 31 and the section at lines 33-48. Old line 132 is line 131, without the restore clause. One line round 3 did not list is stale: N13. |

**"What stays in the script"** — every item is present byte-equal. [Observed] "stays, present byte-equal in head: True" for each
row.

| Item (at `e7f3c71e`) | At the head |
|---|---|
| the handlers (33-35) | 25-27 |
| `leave_if_stopped` (74-78), its message aside | 43-47; only " and restored" is gone (item 9) |
| `end_group` (80-96) | 49-65 |
| the `Popen`, poll loop and `finally` (113-121) | 81-88: `Popen`, reader thread and poll loop byte-equal; `stop.set(); sampler.join()` byte-equal; `end_group` call dedented one level |
| line 61's clean-tree check | 41 |
| `TESTKIT`, still named in `subject` | 30, 108 |
| line 155's check, "whose message "tree not restored" should be reworded" | 116: the code is unchanged ("S-155 code unchanged: True"), and the message is now 'tracked files changed while the script ran'. That is accurate: line 41 required a clean tree, and the script writes no tracked file. |
| the reader thread (115-116), kept by the coordinator's instruction | 83-84 |

**Bytes removed that are on neither list:** none. The two blank lines (16, 73) go with the blocks they separated.

**Listed bytes still present:** none.

**The no-profile path is unchanged by construction.** [Inferred, from the code; supported by the probes]
- On a run without `--profile`, every removed statement at `e7f3c71e` was a no-op:
  - `if profile and not stopped_by: instrument(written)` did not run;
  - `if written:` was false;
  - `prof` was `None`, and `if prof is not None` was false;
  - the inner `try`/`finally` around `end_group` added nothing when its `finally` was empty.
- What the delta changes for that path:
  - two OUT.json keys, `profile: false` and `instrumentation: null`, are no longer written;
  - the stop message loses " and restored";
  - the final check's message is reworded.

## 5. Findings

No blocking finding (no F5).

### N12 — Line 92 (`stdout = output[0] if output else ''`) is dead

**Severity:** low (cruft, no behavior).

**Evidence:**
- [Observed] The AST pass finds exactly one store that is never loaded at the head, `stdout` on line 92. It finds none at
  `e7f3c71e`, and none in the head with line 92 deleted (§3).
- [Observed] Its consumer, the `PROF` parse (old lines 131-132), was on F4's list, but its input line (old 127) was not. So the
  lane, removing exactly the list, kept it, and says so (brief: "kept because it is on neither list").
- [Observed] The reader thread is not dead. With `stdout=subprocess.PIPE` it still drains the pipe, and the poll loop waits for
  its EOF (lines 82-85). Only the string it collects is unused.
- [Observed] So N9's consequence has changed. BADUTF8-np at the head: exit 0, the thread's "UnicodeDecodeError: 'utf-8' codec
  can't decode byte 0xff in position 23: invalid start byte" on stderr, and the run recorded from vitest's report. An empty
  profile can no longer result, since nothing parses stdout.

**Is keeping it a defect?** No, a note. It is on neither of F4's lists, it changes no output, and the brief's REVISE test ("a
listed byte left, a kept behavior broken, a dangling reference that would mislead a user") does not reach it. syzygy-bpyt.4.27,
which re-adds a stdout consumer, would need the line again.

**Failure scenario:** a reader takes `stdout` as consumed and looks for what the script does with vitest's stdout. Or the next
implementer assumes the reader thread exists to feed a parser, and drops it without replacing the pipe drain, which would let a
full pipe stall vitest.

**Proposed fix**, in syzygy-bpyt.4.27 or a follow-up:
- either use the line again, with the `PROF` parse when `--profile` returns;
- or delete line 92 and the `output` list, keep the reader as a pure drain, and comment it ("drains vitest's stdout so a full pipe
  cannot stall it");
- or take round 3's optional item: `stdout=subprocess.DEVNULL`, drop the reader, and loop on `proc.poll()` alone.

### N13 — PR body line 14's justification predates the removal

**Severity:** low.

**Evidence:**
- [Observed] Line 14 says of the six records: "The fix changes how a run is started, stopped and cleaned up, not the vitest
  command it runs or what it reads back." At `d6b04c5f` the head script differs from `0ef82cd0…` (the `3e563ec4` script that
  wrote all six records) in more than that:
  - it has no `--profile`, so it no longer reads back the `PROF` lines that `before-profile.json`'s `profile` rows came from, and
    it cannot regenerate that record;
  - a record it writes has 9 top-level keys where the six have 11. It has no `profile` and no `instrumentation`, under the same
    schema id `vitest-test-durations/1`. My head run gave `['bead', 'host', 'mode', 'project', 'runs', 'schema', 'script',
    'subject', 'text']`.
- [Observed] Round 3's list did not name this sentence (its line 15 then), so leaving it is not an inexact removal.
- [Observed] Nothing reads those keys: the sizing check reads `schema`, `subject.file`, `subject.commit`, `mode` and `runs`
  (`size_vitest_test_timeouts.py:67-73, 88-92`), and it accepted a head record (§3). So no value moves.

**Failure scenario:** a reader re-checking `before-profile.json` under rule 11 takes line 14 at its word. They run the head script
with `--profile` to regenerate it, and get a plain record (N14).

**Proposed fix:** append to line 14: "Since round 3 the script also has no `--profile`: `before-profile.json` can be regenerated
only by `0ef82cd0…` at `3e563ec4`, and a record the head writes carries no `profile` or `instrumentation` key (the sizing reads
neither)." The PR body is not part of this round's frozen subject, so editing it does not retire the clearance.

### N14 — `--profile` is now silently ignored

**Severity:** low.

**Evidence:**
- [Observed] Lines 32-37 read only the named options and ignore every other argument. The parser was as lax at every earlier
  round, so this is not new.
- [Observed] With the flag passed at the head: "run 1: exit 0, 27.1 s, … 299 tests of the file, 0 failed", exit 0, and a record
  with no `profile` key. Nothing says the flag was dropped.
- [Observed] Readers will still meet the flag: rounds 1–3's raws (to be retained at landing) describe it, `before-profile.json`
  records `"profile": true`, and bead `syzygy-bpyt.4.27` plans to bring it back.

**Failure scenario:** someone wants a profile and runs the head script with `--profile`, for example while working
syzygy-bpyt.4.23 (the agreement test's budget). The script exits 0 after a long run under load, with no profile data. The run is
wasted, but no false evidence results, since the record carries no `profile` key.

**Proposed fix**, in syzygy-bpyt.4.27 (or now, if the coordinator prefers):
- refuse any argument outside `--file --project --mode --runs --out` and their values;
- or, at least, `if '--profile' in args: sys.exit('--profile was removed by PR #520 (stopping rule); see syzygy-bpyt.4.27')`.

Add an argument-refusal mutant to the rule-6 record.

### N15 — Two PR-body figures are stale or loose

**Severity:** trivial.

**Evidence:**
- [Observed] Line 48: "none of the 177 paths that changed is one of the 15 subject paths". At `d6b04c5f` the subject is 13 paths,
  after the two deletions. 15 was the `e7f3c71e` count. The claim is still true, since a superset has no overlap
  (`df6046a1..894fb032`: 177 paths, 0 shared with the 15).
- [Observed] Line 39: "the four anchors". `KIT_OLD` and `FILE_OLD` are anchors, and `KIT_NEW` and `FILE_NEW` are their
  replacements.
- [Observed] Lines 151-152 give the lane's exit statuses: EARLYS-np −15 ×3, and MIX-np `run` 143, `cleanup` 130. My run gave −15
  ×6, 129 and −15 (§3). Both are true of their own runs. The variation is round 3's N8, which line 141 already discloses.

**Failure scenario:** a reader re-counting the subject finds 13 and doubts the overlap check.

**Proposed fix:** "13 subject paths (15 before the two deletions)"; "the two anchors and their replacements"; and, on line 154,
"exit statuses vary with timing (N8)".

### N16 — Recovering the removed code depends on #520 landing by merge commit

**Severity:** low.

**Evidence:**
- [Observed] PR body line 45 says the deleted files "remain at `e7f3c71e`".
- [Observed] Bead syzygy-bpyt.4.27 says the code and both files "are recoverable from commit
  e7f3c71ef84f93cbdeef26db54fbdc63e05bc164 (branch agent/syzygy-bpyt.4.13 history, reachable through #520's merge)".
- [Observed] Line 14 rests the six records' provenance on `0ef82cd0…`, the script at `3e563ec4`.
- [Observed] `3e563ec4`, `dc60c5bc`, `e7f3c71e`, `48ee832a` (`timeout-sizing.json`'s subject) and `9e748e68` (the `after`
  records') are ancestors of the head and of no commit on main.
- [Observed] The eight PRs merged most recently (#515–#519, #521, #523, #524) each landed as a two-parent merge commit
  (`gh api …/commits/<oid>`: `parents=2` for each).

**Failure scenario:** #520 is squash- or rebase-merged and the branch deleted. syzygy-bpyt.4.27's starting point, the rule-6
record's history and every record's script provenance then point at commits reachable from no ref (the AGENTS.md guardrail
above).

**Proposed fix:** land #520 with a merge commit, and say so in the PR body's merge note. If a squash is ever chosen, push a tag at
`e7f3c71e` first.

## 6. Every changed output, or the evidence that there is none

- **Product.** [Observed] The delta changes no file under `apps/**` or `packages/**`, and no `vitest.config.ts`, `package.json`,
  workflow, `.syzygy/**` or `openspec/**` file (§1). The test file and its 16 timeouts are unchanged since `e7f3c71e`.
- **GP-Q0's list.**
  - No rendered byte, wire format, refusal string or exit code of anything on `main` changes. The script is new in this PR (`+116/0`
    against `df6046a1`), so its strings and statuses are new outputs, not changed ones.
  - No signed or digest-bound artifact changes. [Observed] The deleted files' and both script versions' digests are cited in 0
    tracked files at the head (§3).
  - No consent, security or retention decision changes.
- **What a gate accepts or refuses.** [Observed] Unchanged:
  - no workflow or battery line names the script or the deleted files (§2, §3);
  - the battery is "commands=110 nonzero=0";
  - hosted CI is green;
  - `--check` gives the committed record save `subject.commit`.
- **The evidence script's own outputs, against `e7f3c71e`.** Each follows from F4's list:
  - `--profile` no longer instruments, profiles or restores, and the flag is now ignored (N14);
  - OUT.json no longer carries `profile` or `instrumentation` (N13);
  - the stop message is "stopped by SIG…: the run in progress, if any, was ended and is not recorded", without " and restored";
  - the final refusal "tree not restored" is now "tracked files changed while the script ran";
  - a decode error in the reader thread now costs only a stderr traceback (N12).

  [Observed, and Inferred from §4's construction] Unchanged on the no-profile path: exit codes (0 on the normal path, 128 + n or the N8 cases on a stop), the write set
  (P0-np), and the record's other keys and values.
- **Evidence.** Two files are deleted, with no citer left. No duration or sizing record changed. `check_governance` and
  `check_quotations` are clean.

## 7. Cleanup

- **Deleted.**
  - Both scratch clones, `rev-520d/clone` and `rev-520d/clone2`. Before that, I confirmed:
    - `git status --porcelain --untracked-files=no` was empty in each;
    - neither had a `.git/index.lock`;
    - `tools/cwd_census.py` gave "processes 1843, cwd unreadable 1696, cwd under prefix 0" for `rev-520d/`. [Inferred] A cwd is
      unreadable only for another user's process, so none of the 1,696 can be mine.
  - Every TMPDIR I made: `/tmp/r520d-npm`, `-gates`, `-size`, `-battery` and `-flag`. The probe removed each attempt's own
    `/tmp/r520c-*` directory itself.
  - Nothing outside these was deleted.
- **Processes.** The only kills were by the probe: SIGKILL by PID to a mutant's survivors, taken from its `/proc` walk of its own
  child, its seen groups, or its cwd-in-clone scan. No kill was by name or pattern.
- **Nothing pushed, commented or merged.** No bead was changed (`bd show` only). No worktree under
  `/home/tze/GitHub/syzygy/.worktrees/` was touched.
- **Kept**, under `/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad/rev-520d/`.
  `KEPT-FILES.sha256` lists all 109 kept files with their sha256, every file except this raw and the list itself. The list is
  sha256 `0670b5df1ee56b6927fe7c8ee392ef47acb241042d0f4b92efbc24bb125b5d7b`. This raw's own digest is in the coordinator message.
  - Tools (`tools/`):
    - `check_identity.py` `5c27ada5…`, `check_exactness.py` `8df63e8c…`, `sweep.py` `6eaf28ac…`, `dead_names.py` `54aed715…`;
    - `battery.py` `cdf20389…` and `cwd_census.py` `6afc2cc9…`, round 3's, unchanged;
    - `r3/`: round 3's probe tools. `probe.py` `f26355ca…` is `probe-wave3.py` with only the head pin changed. The other six are
      byte-identical to round 3's;
    - `r3m/`: the mutant probe `probe.py` `0861dc65…`, and the mutants mk2 `886448b3…`, mk3 `5c27d138…` and mk6 `fab589c0…`.
  - Results:
    - `check-identity.txt`, `check-exactness.txt`, `check-exactness-selftest.txt` with its `selftest/` inputs, `dead-names.txt`,
      `sweep.txt`;
    - `probes/`, `probes-head.log`, `probes-badutf8.log`, `probes-summary.txt`;
    - `probes-mutants/`, `probes-mutants.log`, `probes-mutants-summary.txt`, `mutants.json`;
    - `sizing-check-head.json`, `sizing-check-head.log`, `sizing-check-compare.txt`, `sizing-with-head-record.log`;
    - `head-record-profile-flag.json`, `profile-flag-run.log`;
    - `check-governance.log`, `check-quotations.log`, `battery.log`, `battery.json`;
    - `npm-ci.log`, `npm-ci-clone2.log`;
    - `pr-body.md`, `bead-4.24.txt`, `bead-4.24.json`.
