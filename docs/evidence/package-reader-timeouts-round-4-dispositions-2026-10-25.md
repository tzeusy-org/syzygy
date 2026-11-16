# Package-reader timeouts: review dispositions, rounds 1 to 4

[Observed] This record dispositions the four CC-REV-1 review rounds of
`syzygy-bpyt.4.13` (pull request #520). The change is test sizing and its
evidence tools:
- 16 of the 299 tests in
  `packages/polaris-generation-consent/src/package-reader.test.ts` carry an
  explicit timeout. Each is that test's worst measured duration × 3, rounded
  up to a whole 5 s. Apart from those arguments and one comment, the file is
  byte-identical to its base.
- `scripts/measure_vitest_test_durations.py` measures per-test durations.
- `scripts/size_vitest_test_timeouts.py` sizes the timeouts, and its
  `--check` re-checks a committed sizing against the file.

The lane's evidence is under `docs/evidence/syzygy-bpyt-4-13/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-PACKAGE-READER-TIMEOUTS-1-RAW.md` | `REVISE` | `3e563ec4` | `r1-review.diff` sha256 `051d1a16c794059c41c10cfe2a78499fd2a102e5f6671c582cd0c67c9ebaff94` |
| 2 | `docs/reviews/R-GP-IMPL-PACKAGE-READER-TIMEOUTS-2-RAW.md` | `REVISE` | `dc60c5bc` | `r2-review.diff` sha256 `136f86ee0c0053f678e2d60659505834551b51e20440000b6c40bc364572894e` |
| 3 | `docs/reviews/R-GP-IMPL-PACKAGE-READER-TIMEOUTS-3-RAW.md` | `REVISE` | `e7f3c71e` | `r3-review.diff` sha256 `c4dae8b0d56e1bcb851304b4c44f06a1c0f2f562bef442eb468708869f75a4c0` |
| 4 | `docs/reviews/R-GP-IMPL-PACKAGE-READER-TIMEOUTS-4-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `d6b04c5f` | `r4-review.diff` sha256 `b7d11dbc9a20dd707e14ae58ed6ddb21001820f1aea260bd5e08c304ef980dc3` |

Round 4's subject equals `git diff df6046a153fe130202abdf6bd3045a79ba143879
d6b04c5f03978b2a8fbc87afc61c725d91eca0f4`. Round 4 found no overlap between
the 13 subject paths and the 300 paths main changed through `a088f1ca`. At
landing the branch took one merge of main, which then carried #525 and #526
as well. The merge changed no subject path, and
`git diff origin/main HEAD | sha256sum` printed the same digest as round 4's
subject.

Two stopping rules were set in advance, and both were applied:
- **Before round 3:** if round 3 found a blocking defect in `--profile`'s stop
  handling, `--profile` would leave this PR rather than take a fourth repair
  round. Round 3 found F4 there, so the lane removed `--profile`. Round 4 was
  narrow and checked only that removal.
- **The owner's notes-only stopping rule**
  (`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
  section 1). Round 4 found notes only, so it clears the exact bytes it read,
  and those bytes are not edited.

This record sits beside the bytes. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

Class none, by all four reviewers' rulings (round 1 section 2, "Class ruling:
none."; rounds 2 to 4 each confirm it). The change touches only one test
file's timeout arguments and comment, two evidence scripts new in this PR,
and evidence records. Round 4 found the measurement script named by 8 of the
3,699 tracked files at the head, none of them a workflow, manifest, battery
line or `PROJECT-STATUS.md`, so no gate runs it. Class 4 is adjacent and
untouched, because the consent package's product code is not in the diff.
Class 6 does not apply, because the scripts are new and no consumer of main
can depend on their flags.

GP-Q0 therefore needs no differential, mutant set or owner notice for a
class. Its behavior-preserving test holds: round 4 section 6 found no
rendered byte, wire format, refusal string or exit code of anything on main
changed; no signed or digest-bound artifact changed; and no consent, security
or retention decision changed. What a gate accepts or refuses is unchanged.
The battery is 110/0, and the default the tests carry stays 5 s.

## Round 1: one blocking finding and six notes

- **F1** (blocking): `measure_vitest_test_durations.py --profile` could leave
  tracked files instrumented, through an exception or a SIGTERM. Repaired in
  parts over three rounds:
  - Round 2 found (a), (b), (c), (e) and (g) repaired.
  - (d), no descendant outliving a stopped run, and (f), claims that say what
    the script does, were not repaired in full. They became round 2's F2 and
    F3.
  - The `--profile` mode itself was removed after round 3 (F4, below), so
    the script now writes no tracked file. Round 4 confirmed the removal is
    exact against round 3's list.
- **N1** (`--check` did not pin the default it measures against; mutant R5
  survived): **repaired**. Round 2 reproduced R5's kill, and its own R6 and R7
  were killed at the head and survived `3e563ec4`.
- **N2** (the new ceilings let a 10× slowdown through at ordinary load, and
  nothing owned the agreement sweep's cost): **filed** as
  `syzygy-bpyt.4.23`.
- **N3** (the ×3 margin is unverified at its envelope) and **N4** (the
  timeouts hold only for the whole file run in order): **repaired** in the
  test file's comment, as comment lines only. Round 2 found 16 of 16 timeouts
  equal and the non-comment lines unchanged.
- **N5** (a dangling "follow-up below" in the PR body): **repaired**. The PR
  body names `syzygy-bpyt.4.23` and `syzygy-bpyt.4.24`.
- **N6** (closing 4.13 on this PR would drop the scope its comments added):
  **filed** as `syzygy-bpyt.4.24`, which sizes the dossier-project load
  timeouts. Its wording was corrected on 2026-10-25.

## Round 2: two blocking findings and one note

- **F2** (a stop signal during `subprocess.Popen(...)` left vitest's whole
  tree running) and **F3** (the restore and the group stop in `finally` could
  be skipped): **repaired** at `e7f3c71e`. Round 3 ran 196 attempts against
  that script, and no stop signal, however timed, however many and in
  whatever mix, left the tree dirty or a vitest descendant running. The one
  exception is a documented limit: a process that leaves vitest's process
  group.
- **N7** (the SIGHUP handler overrode an inherited `SIG_IGN`): **repaired**.
  Each handler is installed only when the inherited disposition is not
  `SIG_IGN`.

## Round 3: one blocking finding and three notes

- **F4** (blocking): the restore depended on `git checkout` succeeding, so a
  held index lock left both instrumented files written, on the stop path and
  on the normal path. **Resolved by the stopping rule**: `--profile` left this
  PR at `d6b04c5f`. The repair is filed as `syzygy-bpyt.4.27`, which
  restores by writing the read bytes back and carries the LOCK and LOCKN
  probes.
- **N8** (the exit status is not always 128 + the first signal's number):
  **filed** in `syzygy-bpyt.4.27` (AC2). The stop path that remains still has
  it, and the PR body discloses it.
- **N9** (the reader thread swallowed its own exception): **filed** in
  `syzygy-bpyt.4.27` (AC2). Round 4 found that its consequence changed: a
  decode error now costs only a stderr traceback, and it can no longer yield
  an empty profile (N12).
- **N10** (PR body line 144 said "main unchanged at `df6046a1`"):
  **repaired** before round 4, which found it fixed.

## Round 4: notes only

- **N12** (line 92's `stdout` is a dead store; the reader thread still drains
  the pipe): **filed** in `syzygy-bpyt.4.27` by comment. That bead re-adds a
  stdout consumer. If it does not, delete the line and comment the reader as
  a pure drain.
- **N13** (PR body line 14's justification predates the removal):
  **corrected** in the PR body at landing. The six records can be
  regenerated only by the `3e563ec4` script, and a record the head writes
  carries no `profile` or `instrumentation` key. Round 4 confirmed that the
  sizing reads neither key.
- **N14** (`--profile` is now silently ignored): **filed** in
  `syzygy-bpyt.4.27` by comment. Refuse any argument outside `--file
  --project --mode --runs --out`, and add an argument-refusal mutant.
- **N15** (two stale or loose PR-body figures): **corrected** in the PR body
  at landing: "13 subject paths (15 before the two deletions)" and "the two
  anchors and their replacements".
- **N16** (recovering the removed code depends on #520 landing by merge
  commit): **met**. #520 landed by a two-parent merge commit, so `3e563ec4`,
  `dc60c5bc`, `e7f3c71e`, `48ee832a` and `9e748e68` stay reachable from main.

## Retained review evidence

All four reviewers' tools and results are kept under
`docs/evidence/package-reader-timeouts-review-2026-10-25/`, 697 files:
- `r1/` (58 files), `r2/` (119), `r3/` (414) and `r4/` (106). Each holds that
  round's kept files and a copy of its `KEPT-FILES.sha256`.
- Rounds 1, 2 and 4 cite their list's digest in the raw. Round 3 gave its
  list's digest in the message that carried its raw
  (`9cfd2c934a2f6f7c073a95a520925fce5cffe4ca10ad35fecf606d3c030033c7`).
- Each list was checked by `sha256sum -c` against the reviewer's directory at
  landing, before anything was dropped: 68, 125, 420 and 109 rows, 0 failures.

Not retained:
- each round's `npm ci`, typecheck, governance, quotation and project-run
  logs;
- its re-derived subject diffs;
- round 1's two run reports over 300 KB, the head summary and the first
  full-run report, which its list names under its runs directory.

The raws quote each log's result line, and each diff is the `git diff` the
raw names. The lists still name the dropped files, so a row with no file
beside it is one of these.
