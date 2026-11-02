# Review campaign files (syzygy-gkvu)

## Patterns

- `R-REVIEW-CAMPAIGN-FILES-\d+-RAW\.md`

## What was under review

PR #570 (`syzygy-gkvu`): the review-campaign table moved out of `docs/README.md` into one file per campaign under `docs/review-campaigns/`, with every count, date range and total derived by `scripts/check_docs_review_campaign_partition.py --table`; pre-merge PR review, implementation, binds nothing

## Last verdict of record, and where the findings landed

Round 1 `CONFIRM WITH EXCEPTIONS` (`R-REVIEW-CAMPAIGN-FILES-1-RAW.md:2`) over `6481cedb`, five notes and no blocking finding. N1 (a count written as prose survives the parser), N2 (the pre-existing verdict-citation predicate accepts a non-verdict line) and N3 (the "four ejected PRs" figure) are reported to the coordinator as follow-ups; N4 and N5 need no action.
