# R-REVIEW-CAMPAIGN-FILES-1 — PR #570 review of syzygy-gkvu (review bead syzygy-frt1)
Verdict: CONFIRM WITH EXCEPTIONS
Reviewed commit: 6481cedb3f0c14388d42dd814f96496362490f89
Subject: git diff 43dfd9b0f4d69c3077650a426f84050e7608f38d 6481cedb3f0c14388d42dd814f96496362490f89 sha256 dc0387f84c3d6dc8ed92bfee37eef58003c828a025e8cf561eb5ccfc4c07cd5c

Reviewer: fresh-context PR-review worker (Claude Opus 5.5), GitHub login Tzeusy, 2026-11-02.
Base: `origin/main` 43dfd9b0, which is the PR's merge base (no rebase performed).
Scope: one commit, 116 files; 111 campaign fragments plus `docs/review-campaigns/README.md`,
`scripts/check_docs_review_campaign_partition.py`, `docs/README.md`, `AGENTS.md`,
`scripts/simulate_redis_local_agent_sitting.py`.

## Verdict basis

No blocking finding. Five notes, none of which changes what the check accepts on
this head. Acceptance criteria of syzygy-gkvu: (1) two raw-adding PRs queue without
textual conflict, (2) the partition check still fails on an unmatched raw — both
observed below.

## Checks run

- [Observed] Lossless migration, cells. `--table` at 6481cedb rendered 111 rows; a
  Python cell parser (split on unescaped `|`) over main's `docs/README.md` table and
  the rendered table: same 111 display names, 0 differing cells across all five
  columns (display, Files, Recorded, subject, verdict). Row order differs: the
  renderer sorts by (recorded, key); main's table had its own order. Navigation only.
- [Observed] Lossless migration, patterns. Loading main's script's `CAMPAIGNS` tuple
  and the new fragments: 111 vs 111, 0 mismatches in key, display or pattern tuple.
- [Observed] Main's own count sentence said "620 files, 620 assigned" while the
  per-row counts sum to 621 at this base: the stale-total race the PR removes.
- [Observed] `--check` at 6481cedb: `partition PASS: denominator=621; assigned=621;
  raw=587; other=34; unmatched=0; overlaps=0; campaigns=111`; second method
  ls-files=621, ls-tree=621. `--selftest`: 25 fixtures PASS.
- [Observed] `python3 scripts/check_governance.py`: 32 OK, 21 WARN, 0 FAIL (53 checks).
- [Observed] Both touched scripts `py_compile`; `re`, `json`, `sys` remain used in the
  simulator after the removal.
- [Observed] Merge: two branches from 6481cedb, each adding one raw claimed by an
  existing campaign (`R-TREE-STYLE-ZA-1-RAW.md`, `R-TREE-STYLE-ZB-1-RAW.md`), merged
  into a third with no conflict (623 tracked files).

## Rule-6 mutations (each in a fresh clone, committed, `--check` run)

| Mutant | Result |
|---|---|
| unmatched raw `R-ZZZ-NO-CAMPAIGN-1-RAW.md` | killed: `unmatched: docs/reviews/R-ZZZ-NO-CAMPAIGN-1-RAW.md`, exit 1 |
| overlap: tree-style-restyle also claims `R-GP-IMPL-OWNER-ACT-FIELDS-1-RAW.md` | killed: `overlap: ... greenfield-parity-implementation, tree-style-restyle`, exit 1 |
| stored count as a heading (`## Files` / `5`) | killed: `unexpected or repeated heading`, exit 1 |
| stored count as prose (`Files: 5. Recorded 2026-10-01.` in the verdict section) | **survived**, exit 0 (N1) |
| empty campaign `zz-empty.md` | killed: `empty campaign: zz-empty`, exit 1 |
| every verdict citation in tree-style-restyle repointed to line 1 | **survived**, exit 0 (N2) |
| `docs/README.md` no longer routes to `review-campaigns/` | killed, exit 1 |

## Act-binding sweep (touched non-fragment files)

- [Observed] sha256 of main's and the PR's bytes of `docs/README.md`,
  `scripts/check_docs_review_campaign_partition.py`, `AGENTS.md`: 16-hex prefixes
  found in no tracked file at main or at the head.
- [Observed] `scripts/simulate_redis_local_agent_sitting.py` main blob digest appears in
  four files of `docs/evidence/p115-implementation-authorization-2026-10-28/`
  (`CONSUMER-CENSUS.json`, `CURRENT-SOURCE-REFRESH.json`, `MANIFEST.json`,
  `SOURCE-BINDINGS.json`). It is a population row of a code-consumer census bound to
  `sourceHead` 973965a8 with a retained copy, not an owned file and not a performed
  act's manifest row; later edits leave the snapshot true for its head (N5).
- [Observed] None of the five paths is named in `scripts/check_governance.py`
  (`ACT_DIGEST_COPY_FILES` included) except `AGENTS.md`, whose entries there are word
  budgets and phrase checks, not digests; CG passes at the head.
- [Observed] The removed simulator workaround is invoked by no `.github/` workflow,
  `package.json` script or other script; its only governed mention
  (`REDIS-LOCAL-AGENT-SITTING-BRIEF.md:538`) describes a 2026-10-07 rehearsal.

## Notes

- N1 (note). A derived figure written as prose inside a section is accepted: the
  parser refuses extra headings, not counts. AGENTS.md's "never reintroduce a count
  into a campaign file (the parser refuses any section but the three it names)" is
  accurate as worded, but a reader may take the parenthetical as enforcement of the
  whole rule. Either narrow the sentence or treat prose counts as review-only.
- N2 (note, pre-existing). `validate_verdict_citation` passes when any one cited
  `<raw>.md:<line>` line matches `CONFIRM|PASS|READY|REVISE|CHANGES REQUESTED|FAIL`
  case-insensitively as a substring. Line 1 of `R-TREE-STYLE-CRAFT-4-RAW.md`
  ("confirmation review 4") satisfies it, so a citation off the verdict line survives.
  The predicate is byte-identical to main's; not a regression of this PR.
- N3 (note). AGENTS.md says "the merge queue ejected four reviewed PRs". [Observed]
  GitHub timeline `RemovedFromMergeQueueEvent` with reason `merge_conflict` over
  #550–#569: three (#559, #560, #569). [Unknown] whether a fourth lies outside that
  window or whether each conflict was on `docs/README.md`; the bead names two.
- N4 (note). Candidate-package prose still describes the old row workflow
  (e.g. `pwb-m2-slice5-implementation-continuation/REVIEW-BRIEF.md:38`,
  `IMPACT-LEDGER.md:238`); historical, and `--check docs/README.md` still parses there.
  No edit asked.
- N5 (note). See the p115 census sweep above; recorded so a later sweep that finds
  the digest does not read it as a binding.

## AGENTS.md bullet accuracy

- [Observed] First bullet: fragment fields, `--table`, `unmatched`, same-commit rule
  match the script. Second bullet: the race history (#89, 2026-09-22; 2026-09-23)
  carries over from main's text; "four" is N3; "different files unless they edit the
  same campaign's verdict" matches the merge demonstration.
