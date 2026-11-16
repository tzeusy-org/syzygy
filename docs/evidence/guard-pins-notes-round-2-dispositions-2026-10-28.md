# Guard-pin follow-up notes, second pass: review dispositions, round 1

[Observed] This record gives the dispositions of the CC-REV-1 review of
`syzygy-bpyt.49` (pull request #553). The change takes the notes N1, N2 and
N3 of PR #547's round-1 review
(`docs/reviews/R-GP-IMPL-GUARD-PINS-NOTES-1-RAW.md`; dispositions
`docs/evidence/guard-pins-notes-round-1-dispositions-2026-10-28.md`). It
changes evidence tooling only: 3 paths under `docs/evidence/syzygy-bpyt-8-39/`,
5 under `docs/evidence/syzygy-bpyt-39/` and a new record directory
`docs/evidence/syzygy-bpyt-49/`. No guard, test, product, workflow or
governed file changes.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) | sha256 of the raw |
|---|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-GUARD-PINS-NOTES-2-RAW.md` | `REVISE` | `6f9c0a5b` | `r1-review.diff` sha256 `445f0b086adf88a4c8ff996dac03853ca10f0a72de9f2b34b208bc9ab6c6e105` | `58610fe6644c0f24c284679ca5a713582f0f7dc7d99fec39c5fc54d5cb00e6b9` |

The subject equals `git diff a1b9bde2 6f9c0a5b`: 17 files, all under
`docs/evidence/`. The reviewer re-derived it (raw section 1).

## The one blocking finding, and why there was no round 2

[Observed] Round 1's only blocking finding, F1, was a sentence in the PR
body: "Commits: `e8cd624e` (the changes and the new tools), then `6f9c0a5b`
(the records those tools wrote …)". Two of the new tools, `record.py` and
`site_drop.py`, are first committed in `6f9c0a5b`, and two records are their
output. The reviewer gave exact replacement text. Lane A applied it to the
body by script, verbatim, with a short "Review round 1" paragraph, and pushed
no commit, so the head stays `6f9c0a5b`. The raw's own check,
`grep -c -F 'the changes and the new tools'` over the served body, prints 0.

As for PR #547, a PR-body sentence is not a reviewed head byte, so the
repair needed no fresh round. Everything else the reviewer checked held:
N1, N2 and N3 met with every copied hunk equal to the reviewer's text; the
three selftests 77/77, 27/27 and 28/28, also on local merges with `1a8864d9`
and `e4a3a607`; `guard_probe.py` 8/8, `mutants.py` 15/15, `site_drop.py`
16/16; both probes re-run byte-identical. Revise-severity findings open: 0.

## Class

[Observed] The reviewer ruled CC-REV-1 class none: evidence tooling only, and
nothing changes what a gate accepts or refuses. No owner notice is due.

## The notes

- **N1** (five sub-predicates of the new `record.py` have no selftest entry),
  **N2** (a guard-mutant row may drop its `old`/`new` and still pass), **N3**
  (the guard's cases reach only the grandparent), **N4** (no live check pins
  the 8.39 hook before the filter), **N5** (the 8.39 probe docstring routes
  to the previous blob's traces) and **N7** (nothing checks
  `site-drop.json`'s `recordSha256`): evidence tooling, carried to
  `syzygy-bpyt.69` with the reviewer's verified fixes.
- **N6** (the record pins `e8cd624e`, which only a merge commit keeps
  reachable): the PR lands by a merge commit.

## The landing

The landing commit merges main `a15b6a04` (PR #549 among others) into the
reviewed head `6f9c0a5b`, with no conflict. Of the PR's 17 paths, main
changed none since the merge base `a1b9bde2`, and every one is byte-equal to
`6f9c0a5b`. The battery at the landing commit and hosted `checks` and `node`
there are in the landing note on the pull request.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/guard-pins-notes-review-2026-10-28/r2/`, 6 files, beside
round 1's `r1/`. The raw's cleanup section lists 6 kept files with their
sha256. At landing, a script checked all 6 against the reviewer's directory:
6 matched, 0 failed, and no file was unlisted. No governance, quotation,
typecheck or `npm ci` log and no copy of the PR body was kept.

This is an implementation record and binds nothing.
