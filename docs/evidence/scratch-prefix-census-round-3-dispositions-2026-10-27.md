# Scratch-prefix census: review dispositions, rounds 1 to 3

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.4.18`
(pull request #522). The change is evidence only. It censuses every scratch
prefix that a SIGKILLed full Vitest run leaves in a private TMPDIR, names the
creating file of each, and gives each a disposition rule. The census and its
tools are under `docs/evidence/scratch-prefix-census-2026-10-23/`. The record
is `census-2026-10-24.json` there, and its run commit is
`a864e999645a071dda40325b2235976590e02973`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-SCRATCH-PREFIX-CENSUS-1-RAW.md` | `REVISE` | `e2aae62e` | `r1-review.diff` sha256 `3b29116c5d59ab9511b05de3626695a64db0ec03b0e13afbc6e32b70491c45f3` |
| 2 | `docs/reviews/R-GP-IMPL-SCRATCH-PREFIX-CENSUS-2-RAW.md` | `REVISE` | `ef7996b5` | `r2-review.diff` sha256 `2a2dda70f287df8f6dd0c8472f43f6df4fba610333716a08544350d928c86b34` |
| 3 | `docs/reviews/R-GP-IMPL-SCRATCH-PREFIX-CENSUS-3-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `367dbb7b` | `r3-review.diff` sha256 `91b328a7b584f0dcb84181a9e2ae8a8f4a4e054d9dad42bc27dbf9b5b7a66446` |

The round-3 subject equals `git diff a088f1caf061c1a2062527ce8521c9b64c3c7fd1
367dbb7ba341d9af23570b949add5f8bf14faa1a`: 41 files, all under the census
directory. At landing the branch took one merge of main, then at `546f1ff0`.
The merge changed no subject path, and
`git diff origin/main HEAD | sha256sum` printed the same digest as the round-3
subject.

Round 3 found five notes and no blocking finding. Under the owner's notes-only
stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

None, by every round's ruling. Round 3 found that the delta is 5 files inside
the census directory, and that the directory, the new function and the new
field are cited only from inside it. No module, endpoint, wire format,
identity, observation seam, security surface or store changes. GP-Q0 asks for
its owner notice only for classes 1, 3, 4 and 6, so none is posted for this
change.

## Rounds 1 and 2

- **Round 1** (REVISE): two blocking findings and ten notes.
  - F1: the exposure "upper bound" was not an upper bound.
  - F2: the partition of the 176 classes summed to 174.
  - N1 to N10 were notes.
  - Round 2's section 4 rules all twelve repaired. It also rules the
    self-test fixture round 1 asked for "repaired as asked".
- **Round 2** (REVISE): one blocking finding and three notes.
  - F3: follow-up F1's acceptance measure could not measure F1, and only an F1
    that dropped guard (6) could meet it.
  - N11: the long sampler gaps and the bounds that rest on them.
  - N12: the aggregation fixture does not pin the leftover counts.
  - N13: F2's first non-vacuity branch.
  - The coordinator's repair list was F3, N11 and N13. N12 was carried into
    the follow-ups as a precondition.
- **Round 3** rules F3, N11 and N13 repaired, and N12 "carried as directed;
  enough to act on cold". 43 of 43 assembler self-test mutants are killed, and
  the census and the self-test re-run byte-identically.

Round 1's F1 and F2 are review findings. They are not the census record's
follow-ups F1 and F2 below, which are proposals the record makes.

## The census record's follow-ups

- **F1**, which names the browser profile for its owner and sweeps it: filed as
  `syzygy-bpyt.4.35`, with the record's `what`, guards and measure copied
  verbatim, its `[Inferred]` label kept (N16), and round 3's N14 additions.
  It depends on `syzygy-bpyt.4.34` (below), and on `syzygy-bpyt.4.28`,
  because both change `removeBrowserProfile` in
  `apps/three-surface-poc/src/cdp-browser.ts`.
- **F2**, a census acceptance criterion for the test-kit temp root: lodged as
  a comment on `syzygy-bpyt.4.4` at merge. The comment carries the measure as
  N17 corrects it. The census rules R6 and R9 stay conditional on it.
- **F3**, the option of a run wrapper that gives the whole Vitest run an
  owner-pid TMPDIR: not filed. The record calls it "an owner or coordinator
  choice". The coordinator declines it for now because F2 covers the same
  leftovers inside the test kit without changing how `npm test` runs. Revisit
  it if F2's residuals are large. The `syzygy-bpyt.4.4` comment says so.
- **No sweep for the restart lock**: recorded as by design. `restart.ts` says
  a stale lock requires operator inspection.

## Notes

- **N12** (round 2, carried): the aggregation fixture gains a seeded run,
  literal leftover and fresh-run values, and a derived name, and the four
  surviving mutants are killed. Filed as `syzygy-bpyt.4.34`, which inlines the
  fourth fragment and points to round 2's retained mutant file (N16).
- **N14** (follow-up F1's part (ii) cannot be run cold as filed):
  - `stillThere` is computed only for a seeded fresh run, so a same-TMPDIR run
    needs an assembler change too;
  - the harness marker also matches the fresh run's own browsers;
  - part (i) names no case for guards 1, 5 and 7, and no positive case.
  All four additions are written into `syzygy-bpyt.4.35`.
- **N15** (`long_gap_trace`'s fixture pins neither its `>=` gap boundary nor
  its published-class filter): the two mutants survive `--selftest`, and they
  change 88 and 157 record paths. Filed in `syzygy-bpyt.4.34`.
- **N16** (the three carriers of F1's measure differ):
  - `syzygy-bpyt.4.35` copies the record's measure verbatim from the JSON,
    with the label;
  - `syzygy-bpyt.4.34` names round 2's raw for N12;
  - the PR body's landing note points to `followUps[0].measure` rather than
    paraphrasing it.
- **N17** (F2's measure reads `leftBySIGKILL`, which a correct non-vacuous
  kill must fail): the `syzygy-bpyt.4.4` comment states the corrected reading.
  The rows of `leftBySIGKILL` whose `afterTheNextFreshRun` `stillThere` is
  above 0 are only R2, R4, R5 and R7 classes (and R3 until F1), and the
  root's own class has `stillThere` 0.
- **N18** (minor wording):
  - the bounds "cross" rather than "overlap";
  - the long-gap count is 445 or 446 across the window;
  - the last gap runs past the command's exit.
  These are carried in `syzygy-bpyt.4.34` for the next regeneration. The
  record is not regenerated here.

## Retained review evidence

Each round's tools and results are kept under
`docs/evidence/scratch-prefix-census-review-2026-10-27/`, in `round-1/`
(31 files), `round-2/` (25) and `round-3/` (20). That is 76 files in all.
The three raws' cleanup sections list 34, 28 and 23 kept files with their
sha256. At landing a script checked all 85 against the reviewers'
directories: 85 matched, 0 failed, and no kept file was unlisted. The retained
76 are copies of those files. `pr-body.md` was renamed `pr-body.txt` in rounds
2 and 3.

Not retained, though each raw quotes its result line: each round's governance,
quotation and `npm ci` logs, 9 files in all.

## Acceptance criterion (round 3, section 7)

The bead asks for a committed census record that names the commit in full, the
per-prefix counts after one SIGKILLed run in a private TMPDIR, and the creating
file for each prefix, with a recorded disposition for each prefix: a sweep, a
test-kit temp root, or a stated residual.

- The commit, the counts and the creating files: met.
- A disposition for each prefix: met conditionally, 176 of 176. R6 and R9 hold
  once F2 is met on `syzygy-bpyt.4.4`.
- Round 2's F3, N11 and N13: met. N12: carried, met as a carry.
- The follow-up texts: met with exceptions (N14, N16, N17), each now written
  into the bead or comment it binds on.
- `long_gap_trace`: met with exceptions (N15).
