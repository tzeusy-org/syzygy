# R-GP-IMPL-STATUS-CG26-MARK-1 — review of syzygy-r8ta, round 1
Verdict: CONFIRM
Reviewed commit: 29ef27e7928b74e217837a0760346752f53e0ba9
Subject: PR #654

Reviewer: fresh context, independent of the lane. Branch `agent/syzygy-r8ta`, one file changed (`PROJECT-STATUS.md`,
+5/-3), merge base equal to `origin/main` (`5ee1c1a1`). No target-repository content was read. Runs were in a
detached worktree at the head; the one mutation rewrote the file and was restored from a backup (clean `git status`).

## Runs at the head

- `python3 scripts/check_governance.py`: `OK    CG-26  published battery and hosted battery are one list — 113
  checks examined, 0 findings — 113 published, 113 hosted, 113 shared`. Totals `32 OK, 21 WARN, 0 FAIL (53 checks)`.
- CG-27 reads `49 claims examined, 19 findings` at the head and at `origin/main` alike: the mark adds and removes no
  finding.
- `python3 scripts/check_governance.py --selftest`: `418 fixtures, 0 failing`.
- `python3 scripts/check_docs_review_campaign_partition.py --check` (head): `partition PASS: denominator=679;
  assigned=679; raw=645; other=34; unmatched=0; overlaps=0; campaigns=118`; second method `git ls-files=679;
  git ls-tree=679`.
- Mutation: changing the sentence's first number word to "twelve" makes `FAIL  CG-26 ... 113 checks examined, 1
  finding`. The claim that CG-26 reads three-digit word counts is therefore observed, not inferred.

## Findings against the brief

1. The new text is true at the head. PR #630 (`syzygy-8tsz`) is `MERGED` (2026-11-03T18:45:44Z) and its commit is in
   the base. CG-26 reads "one hundred and thirteen" and enforces it (mutation above).
2. The stale-marking form matches the file's existing marks: an italic parenthetical `*(Marked DATE: ...)*` as at
   lines 234, 241, 244, 245, 267 and 268 of the file at the head, with the superseded sentence quoted. Date is the
   review day.
3. No act digest copy or count sentence changed. The diff's added and removed lines contain 0 tokens of 16 or more
   hex characters; the sentence "The one hundred and thirteen checks above ..." is outside the hunk.
4. No other claim is restated. The hunk touches only the CG-26 paragraph; the retained-evidence sentence after it is
   unchanged.

## Notes (no exception)

- N1. The mark quotes the 2026-10-21 text up to "the sentence above" and drops the clause "`syzygy-8tsz` tracks that
  separate enforcement gap" and the `[Observed 2026-10-21]` label. The dropped clause is not a live claim (the bead's
  work merged), but "keeps the quoted text" holds for the false sentence only. Optional: quote the label.
