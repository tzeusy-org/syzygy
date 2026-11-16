# Launch-form snapshot oracle: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.8.24`
(pull request #516). In `packages/polaris-dossier/src/launched.test.ts`, each
of the 17 launch-form rows now takes a snapshot of the run's marker before each
ask, reading the disk without calling any `launched.ts` code: its `lstat`
(mode, inode, size), a link's target, and the bytes of a readable regular file.
After the ask it checks the snapshot is unchanged, then still checks that the
run reads `unreadable`. The change also adds the rule-6 record
`docs/evidence/launch-form-snapshot-oracle-mutants-2026-10-22.json`. No
production file changes.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-LAUNCH-FORM-SNAPSHOT-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `bddbbf6c` | `r1-review.diff` sha256 `ad5c93e720b5a1ac43436e626467227b29aa694dc2faba7ee0727760b2538b7c` |

The subject equals `git diff 9a30237e bddbbf6c`. Main had not moved at
landing, so the branch took no further merge. `git diff origin/main HEAD |
sha256sum` printed the same digest before the landing commit.

The reviewer found "No finding is blocking." (section 4), with two notes. Under
the owner's notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Retained review evidence

The reviewer's tools and summary results are kept under
`docs/evidence/launch-form-snapshot-review-2026-10-22/`. Each of the eleven
files under `tools/` has the sha256 the raw gives for it (section 8):
- `tools/rev516_mutants.py`: the harness and the mutant definitions, the
  reviewer's independent transcription of Appendix A of
  `docs/reviews/R-GP-IMPL-LAUNCH-FORM-POSTCONDITION-1-RAW.md` plus the
  reviewer's own four mutants. Its summaries are `rev516-results.json`
  (base and fix), `rev516-results2.json` (the `ctime` variant, N1),
  `rev516-results3.json` with `probe-rows.jsonl` (the per-row snapshot probe)
  and `rev516-results4.json`.
- `tools/fifo_probe.mjs`: the FIFO and stat probe of section 3 item 7. It
  imports no repository code.
- `tools/tree_compare.py`: the blob comparison over the 3312 paths behind
  section 5's "None".
- `tools/check_record.py`, `tools/inspect_record.py` and
  `tools/record_errors.py`: the script checks of the lane's rule-6 record.
- `tools/rerun_files.py`, `tools/project_failures.py`, `tools/log_failures.py`,
  `tools/frames.py` and `tools/summarize.py`, with `rerun-summary.json`: the
  full-project run and the per-file re-runs of section 3 items 8 and 8a.

The per-run Vitest JSON reports, the full-project log, the hosted CI log and
the typecheck and checker logs are not kept. The raw quotes their result lines.

## N1: the snapshot leaves out `ctime`

[Observed by the reviewer] The helper's comment (`launched.test.ts:35-36`)
leaves times out because "a read moves the access time". That reason covers the
access time only. The reviewer's mutant R-chmod-cycle-rewrite chmods the
mode-000 file to 0600, rewrites it at the same size, and chmods it back. It
survives the head at 43/43, because mode, inode and size are unchanged and the
bytes are never read. With `ctimeNs` added to the snapshot, it is killed on that
row and the unmutated file still passes 43/43. On filesystems that reuse inode
numbers, `ctime` would also catch a same-type replacement of a row whose bytes
are not compared. Every survivor leaves the run `unreadable`, so nothing fails
open.

**Disposition:** filed as `syzygy-bpyt.8.30` (P3, test-only, class 4). It takes
the reviewer's option (a): add `ctimeNs` to the snapshot, reword `:35-36`, and
re-run the rule-6 record with R-chmod-cycle-rewrite added. It cannot ride in
this PR, because any byte change would retire this round's review.

## N2: class and owner notice

[Observed by the reviewer] The PR body declared "none in the code", noting that
the #506 and #511 reviewers ruled changes to these rows class 4. The reviewer
rules **class 4** (security) under CC-REV-1 `:51`. The 17 changed bodies are the
rule-6 kill evidence for the fail-closed launched-marker reader, which
`launched.ts:34-35` ties to SEC-3. GP-Q0's three checks:
- The differential is degenerate. No product byte differs, so any
  old-versus-new differential of a product reader is identical by
  construction. The informative comparison, old test against new test over a
  mutant corpus, is the lane's record plus this review's corpus.
- The per-predicate mutant is met. The one new predicate, the snapshot equality
  at `:139`, is killed from each of its three calling asks.
- The owner notice was pending.

**Disposition:** the declared class is superseded by the reviewer's ruling. The
PR's evidence record is not edited. The owner notice for #516 is posted on
`syzygy-bpyt.10` at landing.

## A side observation outside this PR

[Observed by the reviewer, section 8] Two of the reviewer's private TMPDIRs each
held one leftover from a timed-out test in a file this PR does not touch:
`dossier-evidence-*` (from `run-evidence.test.ts`) and `dossier-close-*` (from
`close.test.ts`). The reviewer infers that those files' cleanup may not run
when a test times out.

**Disposition:** recorded as a comment on `syzygy-bpyt.4.17`, the bead that
adds a fresh-TMPDIR leftover check to the unit tier.

## Acceptance criteria (raw section 6)

- AC1 met and exceeded. All 17 rows assert the snapshot and then `unreadable`
  for each of three asks, with `Tests: +0 ~17 -0` and equal name sets. The two
  departures from the bead's letter, an `lstat` snapshot on the FIFO rows and
  the link fields, are sound and test-only.
- AC2 met. The record ran at `5c2b34da`, whose test bytes equal the head's,
  against `launched.test.ts` alone. The five acceptance mutants are each killed
  at the fix on 17 rows. The reviewer reproduced four of the five, plus
  D4-truncate.
- AC3 met on hosted CI: "Tests  5108 passed | 5 skipped (5113)". The local reds
  are load timeouts in nine untouched files (`syzygy-bpyt.4.13`).
- AC4 met for the review. The owner notice is posted at landing (N2).
