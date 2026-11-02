# `docs/review-campaigns/` — one file per review campaign

Each `<key>.md` here names one campaign over `docs/reviews/`. The format is
fixed, and `scripts/check_docs_review_campaign_partition.py` refuses any
other:

```markdown
# <display name>

## Patterns

- `<Python regex, full-matched against the basename under docs/reviews/>`

## What was under review

<prose>

## Last verdict of record, and where the findings landed

<prose citing at least one `<raw>.md:<line>` whose line carries the verdict>
```

No file here stores a figure the helper derives (file count, recorded dates,
totals): print them with `--table`. Routing and procedure live in
`docs/README.md` §"`reviews/` — the corpus, by campaign".
