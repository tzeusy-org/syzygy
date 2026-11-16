# Skipped-population check: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.4.30`
(pull request #527). The change adds one system-tier row,
`packages/cap1-system/src/skipped-population.system.test.ts`. The row
collects the whole tier with Vitest's Node API in a child process, runs
nothing, and compares the collected skipped titles with a literal set:
- the fresh-clone row, for a non-root runner with `SYZYGY_FRESH_CLONE` not
  `'1'`;
- none, with it set to `'1'`, which is how CI runs the tier;
- plus the state-dir mode-000 row, under uid 0.

It fails on a collection error, a non-zero collection exit, a census lacking
the row itself, or a collection hung past 45 s. The bead comes from the
PR #525 round-1 review's note N3: a skip guard that skips too often fails no
exit code. The lane's evidence is under `docs/evidence/syzygy-bpyt-4-30/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-SKIPPED-POPULATION-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `1e444071` | `r1-review.diff` sha256 `ce5c6cc7ef61d9a8cd125aec7e3f9f1f863b1a9dc5b5c20a4e80431416d2bc9c` |

The subject equals `git diff a088f1caf061c1a2062527ce8521c9b64c3c7fd1
1e444071112522ce1b9eb43a8d3964174c54c477`: 3 new files, +692/−0. At landing
the branch took one merge of main, which carried #525, #526 and #520. #525
added the uid-0 skip of the state-dir row that this check's uid-0 set names.
The merge changed no subject path, and
`git diff origin/main HEAD | sha256sum` printed the same digest as the
subject.

The round found five notes and no blocking finding. Under the owner's
notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

Class none, by the reviewer's ruling (section 2), which agrees with the PR's
guess. The reviewer recorded one contested reading and rejected it. Under
uid 0 the expected set admits a skip of the state-dir mode-000 row, which
tests the governed-plane check that the PR #525 review ruled class 1. That
skip came with #525 and its review, and this check grants no skip. It only
refuses populations other than the literal.

GP-Q0's behavior-preserving test holds:
- no product rendered byte, wire format, refusal string or exit code changes,
  because the diff touches no file under `apps/` and no product package;
- no digest-bound artifact changes;
- no consent, security or retention decision changes.

The one exit code that changes is the system tier's, and only on a tree whose
skipped population differs from the literal, which is the bead's purpose. On
a faithful tree the tier gains one passing row. The reviewer found 31 of 31
unmodified runs passing, with the row at 1.4–8.9 s and load1 up to 59.

## Notes

- **N1** (two over-broad skip forms pass): a test that is never registered
  (`if (cond) it(…)`), and a file that leaves the tier through the config's
  `exclude` or `include`. Each passes the check and the whole tier, which
  exits 0. The coordinator reads AC1 as the reviewer does: it is defined over
  the tier's skipped titles, and an unregistered test or an excluded file is
  absent from that set, not skipped in it. So N1 is a note. The tier has no
  conditional registration today (0 over 12 files, raw section 3.10). Both
  forms are added to the PR's residuals at landing. Pinning the tier's file
  set (the reviewer ran the edit: both config forms killed, control passing)
  and disclosing or pinning conditional registration are filed as
  `syzygy-bpyt.4.32`.
- **N2** (an interrupted outer run orphans the collection's session): the
  child is spawned `detached`, and only the 45 s timer in the test worker
  kills it. An outer run interrupted during a hung collection left 13
  processes. On an unmodified tree a collection ends by itself within
  1.4–8.9 s. A parent-watch lifeline, which the reviewer measured at 0
  survivors with the timer path intact, is filed as `syzygy-bpyt.4.32`. The
  PR's "leaves no process behind" holds only when the worker survives to the
  timer, and is restated that way at landing.
- **N3** (the census's state vocabulary is not pinned, and the exit-code
  assertion names nothing): with the `skipped` state renamed, S1 passes on
  the `SYZYGY_FRESH_CLONE=1` arm that CI runs. The PR's residual "If an
  upgrade changes it, the child prints no census and the row fails. It does
  not pass silently" is true for a removed API (`api-renamed`). It is not true
  for a renamed state, which passes on the `SYZYGY_FRESH_CLONE=1` arm. That
  sentence is corrected at landing. Pinning the state set and giving the code
  assertion a message are filed as `syzygy-bpyt.4.32`.
- **N4** (two predicates without a mutant in the lane's record): the
  exit-code predicate (`:84`) and the self-row predicate (`:85`) are killed
  alone by this review's runs, `exit-nonzero` / `exit-nonzero-no-code-check`
  and `vacuous-census-fc` / `vacuous-census-fc-no-self-check`. They are
  retained below and stand as the per-predicate evidence (rule 6). Both
  predicates are load-bearing. `import-fails` /
  `import-fails-no-errors-check` show that the errors predicate is the
  diagnostic and the code predicate backs it.
- **N5** (a PR-body figure and the record tool's survivor predicate): the
  cost is about 1.4–9 s per tier run on this host under load, and 2 s
  hosted, not "2–5 s". It is restated at landing. The tool's survivor test
  ignores the collection's own session id. The reviewer's own count, which
  covers every session a walked process led, found 0 survivors in all 82
  runs without an injected interruption, so no recorded outcome changes. The
  tool fix is optional in `syzygy-bpyt.4.32`, on any regeneration.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/skipped-population-review-2026-10-25/`, 98 files:
- 8 tools;
- 89 results;
- the reviewer's `kept-files-sha256.txt`, whose digest the raw cites.

That list has 102 rows. `sha256sum -c` gave 0 failures against the
reviewer's directory at landing, before anything was dropped.

Not retained: the build, typecheck, `test:system`, governance and quotation
logs. The raw quotes each one's result line.

## Acceptance criteria (raw section 6)

- AC1: met. The check compares the collected skipped set with a literal for
  both `SYZYGY_FRESH_CLONE` arms. "Skipped" means Vitest's collected skip
  state (N1).
- AC2: met. S1 and an added skip elsewhere each fail with the named rows,
  with their fragments stored. Eleven further skip forms of the reviewer's own
  fail as well.
- AC3: met. The head comment states the uid-0 set. It was verified by shim
  only, and real-root behavior stays [Unknown].
- AC4: met. `Tests: +1 ~0 -0` and the class are stated.
